from pathlib import Path
import os

# Загрузить .env до импорта database, чтобы DATABASE_URL был доступен
from dotenv import load_dotenv
_backend_dir = Path(__file__).resolve().parent
for name in (".env.events", ".env.database", ".env", ".env.bot"):
    p = _backend_dir / name
    if p.is_file():
        load_dotenv(p)
    load_dotenv(Path.cwd() / name)  # на сервере WorkingDirectory=backend, cwd тоже подойдёт

from fastapi import FastAPI, HTTPException, Header, Depends, BackgroundTasks, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import json
import hmac
import hashlib
import httpx
from datetime import datetime, timedelta
import uuid
import shutil
import sqlite3
import database

app = FastAPI(title="Digital University MAX Bot + Mini-App", version="2.0.0")

@app.on_event("startup")
async def startup_event():
    """Инициализация баз данных при старте приложения"""
    import logging
    log = logging.getLogger("uvicorn.error")
    database.init_databases()  # может подгрузить .env.database и выставить USE_PG
    if getattr(database, "USE_PG", False):
        log.info("Database: PostgreSQL (users)")
    elif os.environ.get("DATABASE_URL"):
        log.warning("Database: SQLite — установите psycopg2-binary в venv: pip install psycopg2-binary")
    else:
        log.info("Database: SQLite only (DATABASE_URL not set)")
    
    # Очистка истёкших историй и их файлов
    try:
        expired_ids = database.delete_expired_stories()
        for sid in expired_ids:
            story_dir = STORIES_MEDIA_DIR / str(sid)
            if story_dir.exists():
                try:
                    shutil.rmtree(story_dir)
                except Exception:
                    pass
        if expired_ids:
            log.info("Stories cleanup: removed %s expired", len(expired_ids))
    except Exception as e:
        log.warning("Stories cleanup failed: %s", e)
    
    # Проверка токена бота
    if MAX_BOT_TOKEN:
        log.info("MAX_BOT_TOKEN: loaded (from env or .env.bot)")
    else:
        log.warning("MAX_BOT_TOKEN: not set (create backend/.env.bot with MAX_BOT_TOKEN=...)")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SECRET KEY для валидации MAX Bridge
SECRET_KEY = "your-secret-key-change-in-production"

# MAX Bot API Token (из env или backend/.env.bot / .env — как DATABASE_URL)
def _get_max_bot_token() -> str:
    token = (os.environ.get("MAX_BOT_TOKEN") or "").strip()
    if token:
        return token
    try:
        for name in (".env.bot", ".env"):
            p = _backend_dir / name
            if p.is_file():
                for line in p.read_text().splitlines():
                    line = line.strip()
                    if line.startswith("MAX_BOT_TOKEN="):
                        val = line.split("=", 1)[1].strip().strip("'\"").strip()
                        if val:
                            return val
                        break
    except Exception:
        pass
    return ""

MAX_BOT_TOKEN = _get_max_bot_token() or os.environ.get("MAX_BOT_TOKEN", "")
# Документация: https://dev.max.ru/docs-api — запросы на platform-api.max.ru, клавиатура через attachments
MAX_API_BASE = os.environ.get("MAX_BOT_API_BASE", "https://platform-api.max.ru")

# ============ МОДЕЛИ ДАННЫХ ============

class User(BaseModel):
    max_user_id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    language_code: Optional[str] = None
    role: Optional[str] = None
    university_id: Optional[int] = 1

class BotUpdate(BaseModel):
    """Входящее обновление от MAX Bot (message, callback_query или message_callback по доке MAX)."""
    update_id: Optional[int] = None
    message: Optional[Dict] = None
    callback_query: Optional[Dict] = None
    message_callback: Optional[Dict] = None  # MAX: событие при нажатии callback-кнопки

class InlineKeyboardButton(BaseModel):
    text: str
    callback_data: Optional[str] = None
    url: Optional[str] = None
    web_app: Optional[Dict[str, str]] = None

class InlineKeyboardMarkup(BaseModel):
    inline_keyboard: List[List[Dict]]

# ============ БАЗА ДАННЫХ ============
# Используем SQLite базы данных из database.py
# Файлы .db создаются автоматически в папке data/
# users_db и universities_db оставлены для обратной совместимости с ботом
users_db = {}  # Временное хранилище для бота (можно заменить на БД)
universities_db = {}  # Временное хранилище для бота

# ============ MAX BOT API КЛИЕНТ ============

class MAXBotAPI:
    """Класс для работы с MAX Bot API"""
    
    def __init__(self, token: str):
        self.token = token
        self.base_url = MAX_API_BASE
        # MAX: «используйте заголовок Authorization: <token>»
        self.headers = {
            "Authorization": token.strip(),
            "Content-Type": "application/json"
        }
    
    async def send_message(
        self, 
        user_id: int, 
        text: str, 
        reply_markup: Optional[Dict] = None
    ):
        """Отправка сообщения в MAX: пробуем platform-api и api.max.ru/bot, с chat_id и user_id."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            attachments = _reply_markup_to_max_attachments(reply_markup) if reply_markup else []
            # 1) platform-api.max.ru (документация MAX)
            for key in ("chat_id", "user_id"):
                payload = {key: user_id, "text": text, "format": "markdown"}
                if attachments:
                    payload["attachments"] = attachments
                try:
                    r = await client.post(
                        f"{self.base_url}/messages",
                        headers=self.headers,
                        json=payload
                    )
                    if r.status_code in (200, 201):
                        return r.json() if r.content else {}
                except Exception:
                    pass
            # 2) старый endpoint api.max.ru/bot/sendMessage
            payload_fb = {"user_id": user_id, "text": text}
            if reply_markup:
                payload_fb["reply_markup"] = reply_markup
            try:
                r2 = await client.post(
                    "https://api.max.ru/bot/sendMessage",
                    headers=self.headers,
                    json=payload_fb
                )
                if r2.status_code in (200, 201):
                    return r2.json() if r2.content else {}
            except Exception:
                pass
            return {}
    
    async def answer_callback_query(
        self, 
        callback_query_id: str, 
        text: Optional[str] = None,
        show_alert: bool = False
    ):
        """Ответ на нажатие inline кнопки"""
        async with httpx.AsyncClient() as client:
            payload = {
                "callback_query_id": callback_query_id,
            }
            if text:
                payload["text"] = text
            payload["show_alert"] = show_alert
            
            response = await client.post(
                f"{self.base_url}/answerCallbackQuery",
                headers=self.headers,
                json=payload
            )
            return response.json()
    
    async def edit_message_text(
        self,
        user_id: int,
        message_id: int,
        text: str,
        reply_markup: Optional[Dict] = None
    ):
        """Редактирование сообщения (MAX: PUT /messages/{messageId}, клавиатура — attachments)."""
        async with httpx.AsyncClient() as client:
            payload = {"text": text, "format": "markdown"}
            attachments = _reply_markup_to_max_attachments(reply_markup) if reply_markup else []
            if attachments:
                payload["attachments"] = attachments
            response = await client.put(
                f"{self.base_url}/messages/{message_id}",
                headers=self.headers,
                json=payload
            )
            if response.status_code >= 400:
                payload_fb = {"user_id": user_id, "message_id": message_id, "text": text}
                if reply_markup:
                    payload_fb["reply_markup"] = reply_markup
                r2 = await client.post(
                    "https://api.max.ru/bot/editMessageText",
                    headers=self.headers,
                    json=payload_fb
                )
                return r2.json()
            return response.json()

bot_api = MAXBotAPI(MAX_BOT_TOKEN)


def _reply_markup_to_max_attachments(reply_markup: Dict) -> List[Dict]:
    """
    Конвертирует нашу клавиатуру (inline_keyboard с callback_data/url/web_app)
    в формат MAX API: attachments с type=inline_keyboard и payload.buttons.
    Документация: https://dev.max.ru/docs-api — виды кнопок: callback, link, open_app.
    """
    if not reply_markup or "inline_keyboard" not in reply_markup:
        return []
    rows = reply_markup["inline_keyboard"]
    buttons = []
    for row in rows:
        max_row = []
        for btn in row:
            text = btn.get("text", "")
            if btn.get("callback_data"):
                max_row.append({"type": "callback", "text": text, "payload": btn["callback_data"]})
            elif btn.get("url"):
                max_row.append({"type": "link", "text": text, "url": btn["url"]})
            elif btn.get("web_app") and isinstance(btn["web_app"], dict) and btn["web_app"].get("url"):
                max_row.append({"type": "open_app", "text": text, "url": btn["web_app"]["url"]})
            else:
                max_row.append({"type": "callback", "text": text, "payload": btn.get("callback_data", "")})
        buttons.append(max_row)
    return [{"type": "inline_keyboard", "payload": {"buttons": buttons}}] if buttons else []


# ============ INLINE КЛАВИАТУРЫ ============

# URL мини-приложения для кнопки «Открыть приложение» (из настроек бота или env)
MINI_APP_URL = os.environ.get("MINI_APP_URL", "").rstrip("/")

def get_welcome_open_app_keyboard() -> Dict:
    """Клавиатура с одной кнопкой «Открыть приложение» — открывает мини-приложение (MAX: web_app)."""
    url = (MINI_APP_URL or "").strip() or "https://max.ru"
    return {
        "inline_keyboard": [
            [
                {"text": "Открыть приложение", "web_app": {"url": url}},
            ]
        ]
    }

def get_role_selection_keyboard() -> Dict:
    """Клавиатура выбора роли при первом запуске бота (документация MAX: https://dev.max.ru/docs-api, режим клавиатуры)."""
    return {
        "inline_keyboard": [
            [{"text": "👨‍👩‍👧 Родитель", "callback_data": "role_parent"}, {"text": "🎯 Абитуриент", "callback_data": "role_applicant"}],
            [{"text": "👨‍🎓 Студент", "callback_data": "role_student"}],
            [{"text": "👔 Преподаватель", "callback_data": "role_teacher"}, {"text": "🏢 Сотрудник", "callback_data": "role_employee"}],
        ]
    }

def get_main_menu_keyboard(role: str) -> Dict:
    """Главное меню в зависимости от роли"""
    
    keyboards = {
        "student": {
            "inline_keyboard": [
                [
                    {"text": "👤 Профиль", "callback_data": "block_profile"},
                    {"text": "📅 Расписание", "callback_data": "block_schedule"}
                ],
                [
                    {"text": "📚 Материалы", "callback_data": "block_lms"},
                    {"text": "📝 Услуги", "callback_data": "block_services"}
                ],
                [
                    {"text": "🎉 Жизнь", "callback_data": "block_life"},
                    {"text": "💳 Оплата", "callback_data": "block_payment"}
                ],
                [
                    {"text": "🌐 Открыть приложение", "web_app": {"url": "https://cyxar4uk.github.io/max-university/?role=student"}}
                ]
            ]
        },
        "applicant": {
            "inline_keyboard": [
                [
                    {"text": "👤 Профиль", "callback_data": "block_profile"},
                    {"text": "📰 Новости", "callback_data": "block_news"}
                ],
                [
                    {"text": "📄 Поступление", "callback_data": "block_admission"},
                    {"text": "💳 Оплата", "callback_data": "block_payment"}
                ],
                [
                    {"text": "🌐 Открыть приложение", "web_app": {"url": (MINI_APP_URL or "https://max.ru").rstrip("/") + "?role=applicant"}}
                ]
            ]
        },
        "parent": {
            "inline_keyboard": [
                [
                    {"text": "👤 Профиль", "callback_data": "block_profile"},
                    {"text": "📰 Новости", "callback_data": "block_news"}
                ],
                [
                    {"text": "📄 Поступление", "callback_data": "block_admission"},
                    {"text": "💳 Оплата", "callback_data": "block_payment"}
                ],
                [
                    {"text": "🌐 Открыть приложение", "web_app": {"url": (MINI_APP_URL or "https://max.ru").rstrip("/") + "?role=parent"}}
                ]
            ]
        },
        "teacher": {
            "inline_keyboard": [
                [
                    {"text": "👤 Профиль", "callback_data": "block_profile"},
                    {"text": "📅 Расписание", "callback_data": "block_schedule"}
                ],
                [
                    {"text": "📝 Услуги", "callback_data": "block_services"},
                    {"text": "📰 Новости", "callback_data": "block_news"}
                ],
                [
                    {"text": "🌐 Открыть приложение", "web_app": {"url": (MINI_APP_URL or "https://max.ru").rstrip("/") + "?role=teacher"}}
                ]
            ]
        },
        "employee": {
            "inline_keyboard": [
                [
                    {"text": "👤 Профиль", "callback_data": "block_profile"},
                    {"text": "📅 График", "callback_data": "block_schedule"}
                ],
                [
                    {"text": "📝 Заявки", "callback_data": "block_services"},
                    {"text": "📰 Новости", "callback_data": "block_news"}
                ],
                [
                    {"text": "🌐 Открыть приложение", "web_app": {"url": "https://cyxar4uk.github.io/max-university/?role=employee"}}
                ]
            ]
        },
        "admin": {
            "inline_keyboard": [
                [
                    {"text": "📊 Аналитика", "callback_data": "block_analytics"},
                    {"text": "⚙️ Настройки", "callback_data": "block_config"}
                ],
                [
                    {"text": "👥 Пользователи", "callback_data": "block_users"},
                    {"text": "📰 Новости", "callback_data": "block_news"}
                ],
                [
                    {"text": "🌐 Открыть приложение", "web_app": {"url": "https://cyxar4uk.github.io/max-university/?role=admin"}}
                ]
            ]
        }
    }
    
    return keyboards.get(role, keyboards["student"])

def get_quick_actions_keyboard(action: str) -> Dict:
    """Быстрые действия для каждого блока"""
    
    keyboards = {
        "schedule": {
            "inline_keyboard": [
                [
                    {"text": "📅 Сегодня", "callback_data": "schedule_today"},
                    {"text": "🗓️ Неделя", "callback_data": "schedule_week"}
                ],
                [
                    {"text": "⏰ Следующее занятие", "callback_data": "schedule_next"},
                    {"text": "🔄 Изменения", "callback_data": "schedule_changes"}
                ],
                [
                    {"text": "🌐 Открыть полное расписание", "web_app": {"url": "https://cyxar4uk.github.io/max-university/schedule"}}
                ],
                [
                    {"text": "« Назад в меню", "callback_data": "back_to_menu"}
                ]
            ]
        },
        "lms": {
            "inline_keyboard": [
                [
                    {"text": "📚 Мои курсы", "callback_data": "lms_courses"},
                    {"text": "📝 Задания", "callback_data": "lms_assignments"}
                ],
                [
                    {"text": "⏰ Дедлайны", "callback_data": "lms_deadlines"},
                    {"text": "📖 Библиотека", "callback_data": "lms_library"}
                ],
                [
                    {"text": "🌐 Открыть LMS", "web_app": {"url": "https://cyxar4uk.github.io/max-university/courses"}}
                ],
                [
                    {"text": "« Назад в меню", "callback_data": "back_to_menu"}
                ]
            ]
        },
        "profile": {
            "inline_keyboard": [
                [
                    {"text": "🎓 Студенческий билет", "callback_data": "profile_card"},
                    {"text": "📊 Статистика", "callback_data": "profile_stats"}
                ],
                [
                    {"text": "⚙️ Настройки", "callback_data": "profile_settings"}
                ],
                [
                    {"text": "🌐 Открыть профиль", "web_app": {"url": "https://cyxar4uk.github.io/max-university/profile"}}
                ],
                [
                    {"text": "« Назад в меню", "callback_data": "back_to_menu"}
                ]
            ]
        },
        "services": {
            "inline_keyboard": [
                [
                    {"text": "📄 Заказать справку", "callback_data": "services_certificate"},
                    {"text": "📝 Подать заявление", "callback_data": "services_application"}
                ],
                [
                    {"text": "💳 Оплата", "callback_data": "services_payment"},
                    {"text": "🎫 Пропуск", "callback_data": "services_pass"}
                ],
                [
                    {"text": "🌐 Все услуги", "web_app": {"url": "https://cyxar4uk.github.io/max-university/services"}}
                ],
                [
                    {"text": "« Назад в меню", "callback_data": "back_to_menu"}
                ]
            ]
        },
        "life": {
            "inline_keyboard": [
                [
                    {"text": "🎉 События сегодня", "callback_data": "life_events_today"},
                    {"text": "📰 Новости", "callback_data": "life_news"}
                ],
                [
                    {"text": "💼 Вакансии", "callback_data": "life_jobs"},
                    {"text": "🏛️ Клубы", "callback_data": "life_clubs"}
                ],
                [
                    {"text": "🌐 Вся внеучебка", "web_app": {"url": "https://cyxar4uk.github.io/max-university/events"}}
                ],
                [
                    {"text": "« Назад в меню", "callback_data": "back_to_menu"}
                ]
            ]
        }
    }
    
    return keyboards.get(action, get_main_menu_keyboard("student"))

# ============ ОБРАБОТЧИКИ КОМАНД ============

async def handle_start_command(user_id: int, user_data: Dict):
    """Обработка команды /start: создаём/обновляем пользователя в БД, при первом запуске — только выбор роли (клавиатура); иначе приветствие + «Открыть приложение»."""
    first_name = user_data.get("first_name") or ""
    last_name = user_data.get("last_name") or ""
    username = user_data.get("username")
    existing = database.get_user(user_id)
    if not existing:
        database.create_user({
            "max_user_id": user_id,
            "first_name": first_name,
            "last_name": last_name,
            "username": username,
            "photo_url": None,
            "language_code": user_data.get("language_code"),
            "role": None,
            "university_id": 1,
        })
    else:
        database.update_user_profile(user_id, first_name=first_name, last_name=last_name, username=username)
    existing = database.get_user(user_id)
    role = (existing or {}).get("role")
    users_db[user_id] = users_db.get(user_id) or {}
    if role:
        users_db[user_id]["role"] = role
    if not role:
        text = (
            f"👋 Привет, {first_name or 'друг'}!\n\n"
            "Добро пожаловать в **Цифровой университет** на платформе MAX.\n\n"
            "Выберите свою роль — затем откроется приложение:"
        )
        await bot_api.send_message(user_id=user_id, text=text, reply_markup=get_role_selection_keyboard())
        return
    text = (
        f"👋 Привет, {first_name or 'друг'}!\n\n"
        "Добро пожаловать в **Цифровой университет**.\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение:"
    )
    await bot_api.send_message(user_id=user_id, text=text, reply_markup=get_welcome_open_app_keyboard())
    menu_text = f"Или выберите раздел:\n\nВаша роль: {get_role_name(role)}"
    await bot_api.send_message(user_id=user_id, text=menu_text, reply_markup=get_main_menu_keyboard(role))

async def handle_help_command(user_id: int):
    """Обработка команды /help"""
    text = """
📚 **Доступные команды:**

/start - Главное меню
/help - Помощь
/profile - Мой профиль
/schedule - Расписание на сегодня
/assignments - Мои задания
/events - События
/services - Электронные услуги

**Быстрые команды:**
/next - Следующее занятие
/deadline - Ближайший дедлайн
/card - Студенческий билет
/news - Последние новости
    """
    
    await bot_api.send_message(user_id=user_id, text=text)

# ============ ОБРАБОТЧИКИ CALLBACK ============

async def handle_role_selection(user_id: int, callback_query_id: str, role: str, message_id: int):
    """Обработка выбора роли: сохраняем в БД и в users_db, затем показываем кнопку «Открыть приложение» с start_param (роль передаётся в мини-апп)."""
    if user_id not in users_db:
        users_db[user_id] = {}
    users_db[user_id]["role"] = role
    users_db[user_id]["selected_at"] = datetime.now().isoformat()
    database.update_user_role(user_id, role, 1)
    await bot_api.answer_callback_query(
        callback_query_id=callback_query_id,
        text=f"Роль выбрана: {get_role_name(role)}"
    )
    url = (MINI_APP_URL or "").strip() or "https://max.ru"
    if "?" in url:
        open_url = f"{url}&role={role}"
    else:
        open_url = f"{url}?role={role}"
    text = (
        f"✅ Вы выбрали роль: **{get_role_name(role)}**\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение — в нём будут сохранены ваше имя, фамилия и роль."
    )
    await bot_api.edit_message_text(
        user_id=user_id,
        message_id=message_id,
        text=text,
        reply_markup={"inline_keyboard": [[{"text": "Открыть приложение", "web_app": {"url": open_url}}]]}
    )

async def handle_block_selection(user_id: int, callback_query_id: str, block: str, message_id: int):
    """Обработка выбора блока"""
    
    block_names = {
        "profile": "👤 Профиль",
        "schedule": "📅 Расписание",
        "lms": "📚 Учебные материалы",
        "services": "📝 Электронные услуги",
        "life": "🎉 Внеучебная жизнь",
        "news": "📰 Новости",
        "payment": "💳 Оплата",
        "admission": "📄 Поступление",
        "analytics": "📊 Аналитика",
        "config": "⚙️ Настройки",
        "users": "👥 Пользователи"
    }
    
    # Отвечаем на callback
    await bot_api.answer_callback_query(
        callback_query_id=callback_query_id,
        text=f"Открываю {block_names.get(block, block)}"
    )
    
    # Показываем быстрые действия для блока
    text = f"**{block_names.get(block, block)}**\n\n" \
           f"Выберите действие или откройте полную версию в приложении:"
    
    await bot_api.edit_message_text(
        user_id=user_id,
        message_id=message_id,
        text=text,
        reply_markup=get_quick_actions_keyboard(block)
    )

async def handle_back_to_menu(user_id: int, callback_query_id: str, message_id: int):
    """Возврат в главное меню"""
    
    role = users_db.get(user_id, {}).get("role", "student")
    
    await bot_api.answer_callback_query(
        callback_query_id=callback_query_id,
        text="Возвращаюсь в меню"
    )
    
    text = "📱 Главное меню\n\nВыберите раздел:"
    
    await bot_api.edit_message_text(
        user_id=user_id,
        message_id=message_id,
        text=text,
        reply_markup=get_main_menu_keyboard(role)
    )

# ============ WEBHOOK ENDPOINT ============

def _parse_webhook_body(body: dict):
    """
    Извлекает user_id, text и user_data из тела вебхука MAX.
    Поддерживает разные форматы: message.from.id, message.body.text, body.sender, chat.id и т.д.
    """
    user_id = None
    text = ""
    user_data = {}
    message = body.get("message") or body.get("msg") or body
    if message and isinstance(message, dict):
        from_obj = message.get("from") or message.get("sender") or {}
        if isinstance(from_obj, dict):
            user_id = from_obj.get("id") or from_obj.get("user_id")
            user_data = from_obj
        elif isinstance(from_obj, (int, float)):
            user_id = int(from_obj)
        body_inner = message.get("body")
        text = message.get("text") or (body_inner.get("text") if isinstance(body_inner, dict) else None) or ""
        if not user_id and isinstance(body_inner, dict):
            user_id = body_inner.get("sender_id") or body_inner.get("user_id")
        if not user_id:
            user_id = body.get("user_id") or body.get("sender_id") or (body.get("chat", {}) or {}).get("id")
    if user_id is not None:
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            user_id = None
    text = (text or "").strip()
    return user_id, text, user_data


# Вебхук бота перенесён в TS-бот: services/max-bot (@maxhub/max-bot-api).
# Настройте в MAX URL вебхука на сервис, где запущен TS-бот.
# Синхронизация пользователей: POST /api/bot/sync-user (вызывается из TS-бота).

# ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

def get_role_name(role: str) -> str:
    """Получить красивое название роли"""
    roles = {
        "parent": "Родитель",
        "applicant": "Абитуриент",
        "student": "Студент",
        "teacher": "Преподаватель",
        "employee": "Сотрудник",
        "admin": "Родитель",
    }
    return roles.get(role, role)

# ============ API ДЛЯ MINI-APP (как раньше) ============

@app.get("/")
async def root():
    return {"message": "Digital University MAX Bot + Mini-App", "status": "running"}

def get_user_id_from_headers(x_max_user_id: Optional[str] = Header(None)) -> int:
    """
    Извлекает ID пользователя из заголовков, которые устанавливает frontend
    через интерцептор в MAX Bridge
    В мок-режиме возвращает дефолтный ID
    """
    if not x_max_user_id:
        # В мок-режиме используем дефолтный тестовый ID
        return 10001
    
    try:
        return int(x_max_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

@app.get("/api/health")
async def health_check():
    """Проверка работы сервиса; bot_token_loaded — читается ли MAX_BOT_TOKEN из .env.bot/env."""
    return {"status": "healthy", "bot_token_loaded": bool(MAX_BOT_TOKEN)}


class BotSyncUser(BaseModel):
    """Тело запроса от TS-бота для синхронизации пользователя."""
    max_user_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    university_id: Optional[int] = 1


BOT_SECRET = os.environ.get("BOT_SECRET", "").strip() or _get_max_bot_token()


@app.post("/api/bot/sync-user")
async def bot_sync_user(
    body: BotSyncUser,
    x_bot_secret: Optional[str] = Header(None),
):
    """
    Синхронизация пользователя из TS-бота (@maxhub/max-bot-api).
    Создаёт или обновляет пользователя в БД. Заголовок X-Bot-Secret опционален (можно BOT_TOKEN или BOT_SECRET).
    """
    if BOT_SECRET and x_bot_secret != BOT_SECRET:
        raise HTTPException(status_code=401, detail="Invalid X-Bot-Secret")
    uid = body.max_user_id
    university_id = body.university_id or 1
    existing = database.get_user(uid)
    if existing:
        if body.first_name is not None or body.last_name is not None or body.username is not None:
            database.update_user_profile(
                uid,
                first_name=body.first_name or existing.get("first_name") or "",
                last_name=body.last_name if body.last_name is not None else existing.get("last_name"),
                username=body.username if body.username is not None else existing.get("username"),
            )
        if body.role is not None:
            database.update_user_role(uid, body.role, university_id)
    else:
        database.create_user({
            "max_user_id": uid,
            "first_name": body.first_name or "",
            "last_name": body.last_name,
            "username": body.username,
            "photo_url": None,
            "language_code": None,
            "role": body.role,
            "university_id": university_id,
        })
    user = database.get_user(uid)
    return user or {}


@app.post("/api/users/auth")
async def authenticate_user(user: User, x_max_init_data: Optional[str] = Header(None)):
    """
    Аутентификация пользователя через MAX Bridge
    Валидирует initData и создаёт/обновляет пользователя
    """
    # Проверяем подлинность данных (если init_data предоставлен)
    if x_max_init_data:
        try:
            data = json.loads(x_max_init_data)
            received_hash = data.get('hash')
            
            # Создаём список ключей для проверки (исключая сам hash)
            data_check_string = "\n".join(
                f"{k}={v}" for k, v in sorted(data.items()) 
                if k != 'hash' and isinstance(v, (str, int, float, bool))
            )
            
            # Вычисляем хеш
            secret_key = hashlib.sha256(SECRET_KEY.encode()).digest()
            calculated_hash = hmac.new(
                secret_key,
                data_check_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if received_hash != calculated_hash:
                raise HTTPException(status_code=401, detail="Invalid init data signature")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid init data: {str(e)}")
    
    user_data = {
        "max_user_id": user.max_user_id,
        "first_name": user.first_name or "",
        "last_name": user.last_name,
        "username": user.username,
        "photo_url": user.photo_url,
        "language_code": user.language_code,
        "role": user.role,
        "university_id": user.university_id or 1
    }
    existing_user = database.get_user(user.max_user_id)
    if existing_user:
        database.update_user_profile(
            user.max_user_id,
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            username=user_data["username"],
            photo_url=user_data["photo_url"],
            language_code=user_data["language_code"],
        )
        if user.role:
            database.update_user_role(user.max_user_id, user.role, user_data["university_id"])
        updated = database.get_user(user.max_user_id)
        return {"user": updated, "new_user": False, "message": "User updated"}
    new_user = database.create_user(user_data)
    return {"user": new_user, "new_user": True, "message": "User created successfully"}

@app.put("/api/users/role")
async def update_user_role(
    role: str, 
    university_id: Optional[int] = None,
    user_id: int = Depends(get_user_id_from_headers)
):
    """
    Обновление роли пользователя
    """
    # Проверяем наличие пользователя в БД
    existing_user = database.get_user(user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    valid_roles = ["student", "applicant", "employee", "teacher", "admin"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")
    
    # Обновляем роль в БД
    database.update_user_role(user_id, role, university_id or 1)
    updated_user = database.get_user(user_id)
    
    return {
        "user": updated_user,
        "message": "Role updated successfully"
    }

@app.get("/api/universities/{university_id}")
async def get_university(university_id: int):
    """
    Получение информации о университете
    """
    import sqlite3
    conn = sqlite3.connect(database.UNIVERSITIES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM universities WHERE id = ?", (university_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="University not found")
    
    return dict(row)

@app.get("/api/universities/{university_id}/blocks")
async def get_blocks_config(university_id: int, role: str):
    """
    Получение конфигурации блоков для роли из БД
    """
    valid_roles = ["student", "applicant", "employee", "teacher", "admin"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")
    
    # Получаем конфигурацию из БД
    config = database.get_university_config(university_id, role)
    
    # Получаем название университета
    import sqlite3
    conn = sqlite3.connect(database.UNIVERSITIES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT name, short_name FROM universities WHERE id = ?", (university_id,))
    row = cursor.fetchone()
    conn.close()
    
    university_name = row["name"] if row else "Университет"
    
    # Преобразуем структуру для совместимости
    all_blocks = []
    for section in config["sections"]:
        for block in section["blocks"]:
            all_blocks.append(block["block_type"])
    
    return {
        "blocks": all_blocks,
        "sections": config["sections"],
        "university_name": university_name,
        "header_color": config["header_color"],
        "role": role
    }

@app.get("/api/schedule")
async def get_schedule(
    date: Optional[str] = None, 
    user_id: Optional[int] = None,
    education_level: Optional[str] = None,
    direction: Optional[str] = None,
    course: Optional[str] = None,
    group: Optional[str] = None
):
    """
    Получение расписания пользователя
    Моковые данные для разных ролей
    Поддерживает фильтры для админов
    """
    # Получаем роль пользователя если есть
    role = None
    if user_id:
        user = database.get_user(user_id)
        if user:
            role = user.get("role")
    
    # Моковые данные расписания для студентов (в формате как в примерах)
    mock_schedule_student = [
        {
            "id": 1,
            "time": "14:00 - 14:30",
            "time_start": "14:00",
            "time_end": "14:30",
            "subject": "Введение в экономику",
            "room": "B0308",
            "location": "B0308",
            "teacher": "Елена Наумова",
            "type": "Семинар",
            "indicator": "H",
            "indicator_type": "homework"
        },
        {
            "id": 2,
            "time": "15:50 - 17:10",
            "time_start": "15:50",
            "time_end": "17:10",
            "subject": "Основы Go",
            "room": "B0401",
            "location": "B0401",
            "teacher": "Крутой препод",
            "type": "Семинар",
            "indicator": "10",
            "indicator_type": "minutes"
        },
        {
            "id": 3,
            "time": "18:00 - 19:30",
            "time_start": "18:00",
            "time_end": "19:30",
            "subject": "Матан, Ю1.2",
            "room": "Байкал",
            "location": "Байкал",
            "teacher": "Крутой препод",
            "type": "Лекция"
        }
    ]
    
    # Моковые данные для сотрудников
    mock_schedule_employee = [
        {
            "id": 1,
            "time": "10:00-11:30",
            "subject": "Заседание кафедры",
            "room": "Кабинет 201",
            "teacher": "Зав. кафедрой",
            "type": "Совещание"
        },
        {
            "id": 2,
            "time": "14:00-15:30",
            "subject": "Консультации студентов",
            "room": "Кабинет 205",
            "teacher": "Ваш кабинет",
            "type": "Консультация"
        }
    ]
    
    # Выбираем расписание в зависимости от роли
    if role == "employee":
        mock_schedule = mock_schedule_employee
    elif role == "teacher":
        # Учителя видят свое расписание (пока используем те же данные)
        mock_schedule = mock_schedule_employee
    else:
        mock_schedule = mock_schedule_student
    
    # Применяем фильтры (если указаны)
    if education_level or direction or course or group:
        filtered_schedule = []
        for item in mock_schedule:
            if education_level and item.get("education_level") != education_level:
                continue
            if direction and item.get("direction") != direction:
                continue
            if course and item.get("course") != course:
                continue
            if group and item.get("group") != group:
                continue
            filtered_schedule.append(item)
        mock_schedule = filtered_schedule
    
    return {
        "schedule": mock_schedule,
        "date": date or datetime.now().strftime("%Y-%m-%d"),
        "user_id": user_id
    }

@app.get("/api/courses")
async def get_courses(user_id: Optional[int] = None):
    """
    Получение списка курсов пользователя
    Моковые данные для разных пользователей
    """
    # Моковые данные курсов
    mock_courses = [
        {
            "id": 1,
            "name": "Математический анализ",
            "progress": 65,
            "assignments": 3,
            "next_class": "2025-11-13 09:00"
        },
        {
            "id": 2,
            "name": "Программирование",
            "progress": 78,
            "assignments": 1,
            "next_class": "2025-11-13 10:45"
        },
        {
            "id": 3,
            "name": "Базы данных",
            "progress": 45,
            "assignments": 5,
            "next_class": "2025-11-13 13:00"
        },
        {
            "id": 4,
            "name": "Веб-разработка",
            "progress": 90,
            "assignments": 0,
            "next_class": "2025-11-14 10:00"
        }
    ]
    
    return {"courses": mock_courses, "user_id": user_id}

@app.get("/api/courses/{course_id}")
async def get_course_details(course_id: int):
    """
    Получение детальной информации о курсе
    """
    # Моковые данные для деталей курса
    mock_course_details = {
        1: {
            "id": 1,
            "name": "Математический анализ",
            "authors": "А.С. Глебов К.И. Иванов",
            "description": "Курс по математическому анализу охватывает основы дифференциального и интегрального исчисления, теорию пределов, ряды и функции многих переменных. Изучите фундаментальные концепции математики, необходимые для дальнейшего изучения точных наук и инженерии.",
            "weeks": [
                {"id": 0, "title": "Введение", "subtitle": None, "isActive": False, "status": "past"},
                {"id": 1, "title": "Неделя 1", "subtitle": "Пределы и непрерывность функций", "isActive": False, "status": "past"},
                {"id": 2, "title": "Неделя 2", "subtitle": "Производная и дифференциал", "isActive": False, "status": "past"},
                {"id": 3, "title": "Неделя 3", "subtitle": "Применение производных", "isActive": False, "status": "past"},
                {"id": 4, "title": "Неделя 4", "subtitle": "Интегральное исчисление", "isActive": False, "status": "past"},
                {"id": 5, "title": "Неделя 5", "subtitle": "Определенный интеграл", "isActive": True, "status": "active"},
                {"id": 6, "title": "Неделя 6", "subtitle": "Ряды и их сходимость", "isActive": False, "status": "future"},
                {"id": 7, "title": "Неделя 7", "subtitle": "Функции многих переменных", "isActive": False, "status": "future"},
                {"id": 8, "title": "Неделя 8", "subtitle": "Кратные интегралы", "isActive": False, "status": "future"}
            ]
        },
        2: {
            "id": 2,
            "name": "Программирование",
            "authors": "И.В. Петров М.А. Сидоров",
            "description": "Курс по основам программирования для начинающих. Изучите основные концепции программирования, работу с данными, алгоритмы и структуры данных. Научитесь писать чистый и эффективный код, решать практические задачи и понимать принципы разработки программного обеспечения.",
            "weeks": [
                {"id": 1, "title": "Неделя 1", "subtitle": "Введение в программирование", "isActive": False, "status": "past"},
                {"id": 2, "title": "Неделя 2", "subtitle": "Переменные и типы данных", "isActive": False, "status": "past"},
                {"id": 3, "title": "Неделя 3", "subtitle": "Условия и циклы", "isActive": True, "status": "active"},
                {"id": 4, "title": "Неделя 4", "subtitle": "Функции и модули", "isActive": False, "status": "future"}
            ]
        },
        3: {
            "id": 3,
            "name": "Базы данных",
            "authors": "С.П. Козлов",
            "description": "Изучение основ проектирования и работы с базами данных. Изучите SQL, нормализацию, индексы и оптимизацию запросов. Научитесь проектировать эффективные схемы баз данных и работать с реляционными СУБД.",
            "weeks": [
                {"id": 1, "title": "Неделя 1", "subtitle": "Введение в базы данных", "isActive": False, "status": "past"},
                {"id": 2, "title": "Неделя 2", "subtitle": "SQL основы", "isActive": True, "status": "active"},
                {"id": 3, "title": "Неделя 3", "subtitle": "Нормализация и проектирование", "isActive": False, "status": "future"}
            ]
        },
        4: {
            "id": 4,
            "name": "Веб-разработка",
            "authors": "А.М. Волков",
            "description": "Современная веб-разработка: HTML, CSS, JavaScript, фреймворки и инструменты. Изучите создание интерактивных веб-приложений, работу с API, управление состоянием и современные подходы к разработке фронтенда и бэкенда.",
            "weeks": [
                {"id": 1, "title": "Неделя 1", "subtitle": "HTML и CSS", "isActive": False, "status": "past"},
                {"id": 2, "title": "Неделя 2", "subtitle": "JavaScript основы", "isActive": False, "status": "past"},
                {"id": 3, "title": "Неделя 3", "subtitle": "React и современные фреймворки", "isActive": True, "status": "active"}
            ]
        }
    }
    
    course = mock_course_details.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return course

@app.get("/api/events")
async def get_events(university_id: Optional[int] = None):
    """
    Получение списка событий университета
    """
    # Получаем название университета
    university_name = "Российская академия народного хозяйства"
    if university_id:
        import sqlite3
        conn = sqlite3.connect(database.UNIVERSITIES_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM universities WHERE id = ?", (university_id,))
        row = cursor.fetchone()
        if row:
            university_name = row["name"]
        conn.close()
    
    mock_events = [
        {
            "id": 2,
            "name": "Открытая лекция по AI и машинному обучению",
            "title": "Открытая лекция по AI",
            "date": "2025-11-20T18:00:00",
            "time": "18:00",
            "location": f"{university_name}, Актовый зал",
            "description": "Встреча с ведущими экспертами в области искусственного интеллекта. Обсуждение последних трендов и практических применений AI.",
            "organizer": "Факультет информатики",
            "participants": 200,
            "images": []
        },
        {
            "id": 3,
            "name": "Карьерный форум 2025",
            "title": "Карьерный форум",
            "date": "2025-11-25T09:00:00",
            "time": "09:00",
            "location": f"{university_name}, Конференц-зал",
            "description": "Встреча с работодателями, мастер-классы по составлению резюме и прохождению собеседований. Более 50 компаний-участников.",
            "organizer": "Центр карьеры",
            "participants": 500,
            "images": []
        }
    ]
    
    return {"events": mock_events}

@app.post("/api/events/{event_id}/register")
async def register_for_event(
    event_id: int, 
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """
    Регистрация на событие
    """
    if not user_id:
        # В мок-режиме разрешаем регистрацию без user_id
        user_id = 10001  # Дефолтный тестовый ID
    
    # Сохраняем регистрацию в БД
    success = database.register_for_event(event_id, user_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Already registered for this event")
    
    return {
        "status": "registered",
        "event_id": event_id,
        "user_id": user_id,
        "message": "Successfully registered for event"
    }

@app.get("/api/events/my-registrations")
async def get_user_registrations(user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")):
    """
    Получение списка зарегистрированных событий пользователя
    """
    if not user_id:
        # В мок-режиме используем дефолтный ID
        user_id = 10001
    
    event_ids = database.get_user_event_registrations(user_id)
    return {"event_ids": event_ids}

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    date: str
    location: Optional[str] = None
    organizer: Optional[str] = None
    university_id: int
    images: Optional[List[str]] = []

@app.post("/api/admin/events")
async def create_event(
    event_data: EventCreate,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """
    Создание нового мероприятия (только для админов)
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can create events")
    
    # TODO: Сохранить в БД
    # Пока возвращаем успешный ответ
    return {
        "success": True,
        "event_id": 999,  # Временный ID
        "message": "Event created successfully"
    }

class ScheduleItemCreate(BaseModel):
    time_start: str
    time_end: Optional[str] = None
    subject: str
    room: Optional[str] = None
    teacher: Optional[str] = None
    type: Optional[str] = "Лекция"
    education_level: Optional[str] = None
    direction: Optional[str] = None
    course: Optional[str] = None
    group: Optional[str] = None

@app.post("/api/admin/schedule")
async def create_schedule_item(
    schedule_data: ScheduleItemCreate,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """
    Создание нового занятия в расписании (только для админов)
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can create schedule items")
    
    # TODO: Сохранить в БД
    return {
        "success": True,
        "schedule_id": 999,
        "message": "Schedule item created successfully"
    }

@app.delete("/api/admin/schedule/{item_id}")
async def delete_schedule_item(
    item_id: int,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """
    Удаление занятия из расписания (только для админов)
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can delete schedule items")
    
    # TODO: Удалить из БД
    return {
        "success": True,
        "message": "Schedule item deleted successfully"
    }

@app.get("/api/news")
async def get_news():
    """
    Получение новостей университета
    """
    mock_news = [
        {
            "id": 1,
            "title": "Запуск нового кампуса",
            "content": "Открыт новый корпус с современными лабораториями",
            "date": "2025-11-10",
            "category": "announcement"
        },
        {
            "id": 2,
            "title": "Студент выиграл престижный конкурс",
            "content": "Поздравляем нашего студента с первым местом",
            "date": "2025-11-09",
            "category": "achievement"
        }
    ]
    
    return {"news": mock_news}

# Hub feed: proxy to cold_news feed API (optional; if not set, return empty feed)
COLD_NEWS_FEED_URL = os.environ.get("COLD_NEWS_FEED_URL", "http://localhost:3001")
HUB_FEED_EXCLUDED_SOURCE_ID = "1924118717"  # Исключаем все посты от этого источника

# Моковые новости для ленты (образование, списки учащихся и т.д.)
HUB_FEED_MOCK_POSTS = [
    {
        "id": -1,
        "channel": "Приёмная комиссия",
        "channelUsername": "Приёмная комиссия",
        "text": "Опубликованы списки зачисленных учащихся на 2025/26 учебный год. Ознакомиться с приказами можно в личном кабинете и на стендах приёмной комиссии.",
        "date": (datetime.utcnow() - timedelta(hours=2)).isoformat() + "Z",
        "tema": ["поступление", "списки"],
    },
    {
        "id": -2,
        "channel": "Учебный отдел",
        "channelUsername": "Учебный отдел",
        "text": "Напоминаем о сроках пересдачи сессии: заявления принимаются до конца недели. Расписание консультаций размещено в LMS.",
        "date": (datetime.utcnow() - timedelta(hours=5)).isoformat() + "Z",
        "tema": ["сессия", "учёба"],
    },
    {
        "id": -3,
        "channel": "Новости образования",
        "channelUsername": "Новости образования",
        "text": "В российских вузах стартуют программы дополнительного образования по цифровым компетенциям. Студентам доступны бесплатные курсы по аналитике данных и программированию.",
        "date": (datetime.utcnow() - timedelta(days=1)).isoformat() + "Z",
        "tema": ["образование", "курсы"],
    },
    {
        "id": -4,
        "channel": "Библиотека",
        "channelUsername": "Библиотека",
        "text": "Открыта запись на мастер-класс по работе с научными базами данных. Занятие пройдёт в читальном зале в среду в 15:00.",
        "date": (datetime.utcnow() - timedelta(days=1, hours=6)).isoformat() + "Z",
        "tema": ["библиотека", "мастер-класс"],
    },
]


def _is_post_from_excluded_source(post: dict) -> bool:
    """Проверяет, что пост от источника 1924118717 (исключаем из ленты)."""
    sid = HUB_FEED_EXCLUDED_SOURCE_ID
    for key in ("channel_id", "source_id", "channel", "source"):
        val = post.get(key)
        if val is None:
            continue
        if str(val) == sid or (isinstance(val, int) and str(val) == sid):
            return True
    return False


@app.get("/api/hub/feed")
async def get_hub_feed(
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    channel: Optional[str] = None,
):
    """Proxy to cold_news feed API for Hub page. Исключаем источник 1924118717, добавляем моковые новости."""
    try:
        params = {"limit": min(limit or 20, 100), "offset": offset or 0}
        if channel:
            params["channel"] = channel
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{COLD_NEWS_FEED_URL}/api/feed", params=params)
            r.raise_for_status()
            data = r.json()
        raw_posts = data.get("posts", [])
        total = data.get("total", len(raw_posts))

        # Убираем все посты от источника 1924118717
        posts = [p for p in raw_posts if not _is_post_from_excluded_source(p)]
        removed = len(raw_posts) - len(posts)
        total = max(0, total - removed)

        # На первой странице в начало ленты добавляем моковые новости
        if offset == 0 or offset is None:
            posts = list(HUB_FEED_MOCK_POSTS) + posts
            total += len(HUB_FEED_MOCK_POSTS)

        return {"posts": posts, "total": total}
    except Exception as e:
        print(f"Hub feed proxy error: {e}")
        return {"posts": [], "total": 0}

@app.get("/api/hub/sources")
async def get_hub_sources():
    """Proxy to cold_news sources API for Hub feed source selector."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{COLD_NEWS_FEED_URL}/api/sources")
            r.raise_for_status()
            return r.json()
    except Exception as e:
        print(f"Hub sources proxy error: {e}")
        return {"sources": []}

# External events API (ивенты): proxy to events project API when EVENTS_API_URL is set
EVENTS_API_URL = os.environ.get("EVENTS_API_URL", "").rstrip("/")
EVENTS_BOT_LINK = os.environ.get("EVENTS_BOT_LINK", "https://t.me/event_ranepa_bot")
EVENTS_API_SECRET = os.environ.get("EVENTS_API_SECRET", "").strip()

@app.get("/api/external/events")
async def get_external_events(limit: Optional[int] = 10):
    """Proxy to external events API (Public Events API). Returns list of events and bot_link."""
    if not EVENTS_API_URL:
        return {"events": [], "bot_link": EVENTS_BOT_LINK}
    limit = min(limit or 10, 50)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{EVENTS_API_URL}/events", params={"limit": limit})
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list):
                return {"events": data, "bot_link": EVENTS_BOT_LINK}
            return {"events": data.get("events", data.get("items", [])), "bot_link": data.get("bot_link", EVENTS_BOT_LINK)}
    except Exception as e:
        print(f"External events proxy error: {e}")
        return {"events": [], "bot_link": EVENTS_BOT_LINK}

@app.get("/api/external/events/{event_id}")
async def get_external_event_detail(event_id: str):
    """Подробности мероприятия (для кнопки «Подробнее»). Proxy to external API."""
    if not EVENTS_API_URL:
        raise HTTPException(status_code=404, detail="External events API not configured")
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{EVENTS_API_URL}/events/{event_id}")
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Event not found")
    except Exception as e:
        print(f"External event detail proxy error: {e}")
        raise HTTPException(status_code=502, detail="Failed to load event detail")

class ExternalEventRegisterBody(BaseModel):
    """Тело запроса регистрации на мероприятие (данные пользователя MAX → бот мероприятий)."""
    telegram_id: Optional[int] = None  # Если пользователь привязал Telegram
    max_user_id: Optional[int] = None  # ID в MAX (можно передать как telegram_id для связи)
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    event_id: str

@app.post("/api/external/events/register")
async def register_external_event(
    body: ExternalEventRegisterBody,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID"),
    first_name: Optional[str] = Header(None, alias="X-MAX-First-Name"),
    last_name: Optional[str] = Header(None, alias="X-MAX-Last-Name"),
    username: Optional[str] = Header(None, alias="X-MAX-Username"),
):
    """
    Регистрация на мероприятие в боте мероприятий (RANEPA).
    Передаются: telegram_id (или max_user_id как fallback), username, first_name, last_name, event_id.
    Требует EVENTS_API_SECRET и EVENTS_API_URL.
    """
    if not EVENTS_API_URL or not EVENTS_API_SECRET:
        raise HTTPException(status_code=503, detail="External event registration is not configured (EVENTS_API_URL, EVENTS_API_SECRET)")
    telegram_id = body.telegram_id or body.max_user_id or user_id
    if telegram_id is None:
        raise HTTPException(status_code=400, detail="telegram_id or max_user_id or X-MAX-User-ID required")
    payload = {
        "telegram_id": int(telegram_id),
        "username": body.username or username,
        "first_name": body.first_name or first_name,
        "last_name": body.last_name or last_name,
        "event_id": body.event_id,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{EVENTS_API_URL}/register",
                json=payload,
                headers={"X-Events-Api-Key": EVENTS_API_SECRET, "Content-Type": "application/json"},
            )
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text or "Registration failed")
    except Exception as e:
        print(f"External event register proxy error: {e}")
        raise HTTPException(status_code=502, detail="Registration request failed")

@app.get("/api/statistics")
async def get_statistics(user_id: Optional[int] = None):
    """
    Получение статистики университета (только для администраторов)
    """
    # Для демонстрации разрешаем доступ без проверки
    # В продакшене раскомментируйте проверку:
    # if user_id and (user_id not in users_db or users_db[user_id].get("role") != "admin"):
    #     raise HTTPException(status_code=403, detail="Access denied. Admin role required")
    
    return {
        "total_users": len(users_db) or 1250,
        "active_students": 1542,
        "faculty_members": 287,
        "events_this_month": 12,
        "average_gpa": 3.8
    }
# ============ МОДЕЛИ ДЛЯ АДМИН-ПАНЕЛИ ============

class SectionNameUpdate(BaseModel):
    name: str

class HeaderColorUpdate(BaseModel):
    color: str

class BlockReorder(BaseModel):
    block_ids: List[int]

class BlockAdd(BaseModel):
    block_type: str
    name: str
    order_index: Optional[int] = None

class SectionAdd(BaseModel):
    university_id: int
    role: str
    name: str
    header_color: str = "#0088CC"

class TemplateSave(BaseModel):
    name: str
    description: str
    role: str
    config: Dict

# ============ АДМИН-ПАНЕЛЬ API ============

@app.get("/api/admin/config/{university_id}/{role}")
async def get_admin_config(university_id: int, role: str):
    """Получить конфигурацию для редактирования (только для админов)"""
    config = database.get_university_config(university_id, role)
    return config

@app.put("/api/admin/sections/{section_id}/name")
async def update_section_name(section_id: int, data: SectionNameUpdate):
    """Обновить название раздела"""
    database.update_section_name(section_id, data.name)
    return {"success": True, "message": "Section name updated"}

@app.put("/api/admin/config/{university_id}/{role}/header-color")
async def update_header_color_endpoint(
    university_id: int, 
    role: str, 
    data: HeaderColorUpdate
):
    """Обновить цвет хедера для роли"""
    database.update_header_color(university_id, role, data.color)
    return {"success": True, "message": "Header color updated"}

@app.post("/api/admin/blocks/reorder")
async def reorder_blocks_endpoint(data: BlockReorder):
    """Изменить порядок блоков (drag & drop)"""
    database.reorder_blocks(data.block_ids)
    return {"success": True, "message": "Blocks reordered"}

@app.post("/api/admin/sections/{section_id}/blocks")
async def add_block_endpoint(section_id: int, data: BlockAdd):
    """Добавить блок в раздел"""
    block_id = database.add_block(section_id, data.block_type, data.name, data.order_index)
    return {"success": True, "block_id": block_id}

@app.delete("/api/admin/blocks/{block_id}")
async def delete_block_endpoint(block_id: int):
    """Удалить блок"""
    database.delete_block(block_id)
    return {"success": True, "message": "Block deleted"}

@app.post("/api/admin/sections")
async def add_section_endpoint(data: SectionAdd):
    """Добавить новый раздел"""
    section_id = database.add_section(data.university_id, data.role, data.name, data.header_color)
    return {"success": True, "section_id": section_id}

@app.post("/api/admin/sections/reorder")
async def reorder_sections_endpoint(data: BlockReorder):
    """Изменить порядок разделов (drag & drop)"""
    # Обновляем order_index для разделов
    import sqlite3
    conn = sqlite3.connect(database.CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    for index, section_id in enumerate(data.block_ids):
        cursor.execute("""
            UPDATE sections 
            SET order_index = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (index, section_id))
    
    conn.commit()
    conn.close()
    return {"success": True, "message": "Sections reordered"}

@app.delete("/api/admin/sections/{section_id}")
async def delete_section_endpoint(section_id: int):
    """Удалить раздел"""
    database.delete_section(section_id)
    return {"success": True, "message": "Section deleted"}

@app.get("/api/admin/templates")
async def get_templates_endpoint(role: Optional[str] = None):
    """Получить шаблоны"""
    templates = database.get_templates(role)
    return {"templates": templates}

@app.post("/api/admin/templates")
async def save_template_endpoint(data: TemplateSave):
    """Сохранить шаблон"""
    template_id = database.save_template(data.name, data.description, data.role, data.config)
    return {"success": True, "template_id": template_id}

# ============ МОДЕРАЦИЯ КАСТОМНЫХ БЛОКОВ ============

class CustomBlockSubmit(BaseModel):
    block_type: str
    name: str
    description: str
    code: str  # JavaScript код виджета
    config_schema: Dict  # JSON схема конфигурации

class CustomBlockReview(BaseModel):
    status: str  # 'approved' or 'rejected'
    review_notes: str = ""

@app.post("/api/admin/custom-blocks/submit")
async def submit_custom_block_endpoint(data: CustomBlockSubmit, user_id: int = Header(None, alias="X-MAX-User-ID")):
    """Отправить кастомный блок на модерацию"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    # Проверяем, что пользователь - админ университета
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can submit custom blocks")
    
    block_id = database.submit_custom_block(
        university_id=user.get("university_id", 1),
        submitted_by_user_id=user_id,
        block_type=data.block_type,
        name=data.name,
        description=data.description,
        code=data.code,
        config_schema=data.config_schema
    )
    
    return {"success": True, "block_id": block_id, "message": "Custom block submitted for moderation"}

@app.get("/api/admin/custom-blocks/pending")
async def get_pending_blocks_endpoint(user_id: int = Header(None, alias="X-MAX-User-ID")):
    """Получить список блоков на модерации (только для суперадминов)"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    # TODO: Проверка на суперадмина приложения
    # Пока возвращаем для всех админов
    
    blocks = database.get_pending_custom_blocks()
    return {"blocks": blocks}

@app.post("/api/admin/custom-blocks/{block_id}/review")
async def review_custom_block_endpoint(
    block_id: int, 
    data: CustomBlockReview,
    user_id: int = Header(None, alias="X-MAX-User-ID")
):
    """Одобрить или отклонить кастомный блок (только для суперадминов)"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    # TODO: Проверка на суперадмина приложения
    
    database.review_custom_block(block_id, user_id, data.status, data.review_notes)
    return {"success": True, "message": f"Block {data.status}"}

@app.get("/api/admin/custom-blocks/approved")
async def get_approved_blocks_endpoint(university_id: Optional[int] = None):
    """Получить одобренные кастомные блоки"""
    blocks = database.get_approved_custom_blocks(university_id)
    return {"blocks": blocks}

# ============ КОДЫ ПРИГЛАШЕНИЯ ============

class InvitationCodeUse(BaseModel):
    code: str

@app.post("/api/invitation/use")
async def use_invitation_code_endpoint(data: InvitationCodeUse, user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")):
    """Использовать код приглашения"""
    # user_id из заголовка - это max_user_id
    if not user_id:
        user_id = 10001  # Fallback для мок-режима
    
    # Получаем пользователя по max_user_id
    user = database.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Используем внутренний ID пользователя для связи с кодом
    internal_user_id = user["id"]
    
    result = database.use_invitation_code(data.code, internal_user_id)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation code")
    
    # Обновляем пользователя
    database.update_user_with_invitation_code(
        user["max_user_id"],
        result["id"],
        result["role"],
        result["university_id"]
    )
    
    return {
        "success": True,
        "university_id": result["university_id"],
        "role": result["role"],
        "message": "Invitation code used successfully"
    }

class InvitationCodeGenerate(BaseModel):
    university_id: int
    role: str
    count: int = 1

@app.post("/api/admin/invitation-codes/generate")
async def generate_invitation_codes_endpoint(
    data: InvitationCodeGenerate,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Сгенерировать коды приглашения"""
    if not user_id:
        user_id = 10001  # Fallback для мок-режима
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can generate codes")
    
    # Используем внутренний ID пользователя
    internal_user_id = user["id"]
    
    codes = database.generate_invitation_codes_batch(
        data.university_id,
        data.role,
        internal_user_id,
        data.count
    )
    
    return {"success": True, "codes": codes, "count": len(codes)}

@app.get("/api/admin/invitation-codes")
async def get_invitation_codes_endpoint(
    university_id: int,
    used: Optional[bool] = None,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Получить коды приглашения"""
    if not user_id:
        user_id = 10001  # Fallback для мок-режима
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can view codes")
    
    codes = database.get_invitation_codes_by_university(university_id, used)
    return {"codes": codes}

class StudentsImport(BaseModel):
    university_id: int
    students: List[Dict]  # Список студентов с полями: name, id, role (опционально)

@app.post("/api/admin/invitation-codes/import-students")
async def import_students_endpoint(
    data: StudentsImport,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Импортировать студентов и сгенерировать коды"""
    if not user_id:
        user_id = 10001  # Fallback для мок-режима
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can import students")
    
    # Используем внутренний ID пользователя
    internal_user_id = user["id"]
    
    results = database.import_students_and_generate_codes(
        data.university_id,
        data.students,
        internal_user_id
    )
    
    return {"success": True, "results": results, "count": len(results)}

# ============ ЗАЯВЛЕНИЯ АБИТУРИЕНТОВ ============

@app.get("/api/admission/levels")
async def get_education_levels():
    """Получить список уровней образования"""
    levels = database.get_education_levels()
    return {"levels": [{"id": level, "name": level.capitalize()} for level in levels]}

@app.get("/api/admission/directions")
async def get_admission_directions(
    university_id: int,
    education_level: str
):
    """Получить направления подготовки для уровня образования"""
    directions = database.get_admission_directions(university_id, education_level)
    return {"directions": directions}

@app.get("/api/admission/directions/{direction_id}")
async def get_admission_direction(direction_id: int):
    """Получить направление подготовки по ID"""
    direction = database.get_admission_direction(direction_id)
    if not direction:
        raise HTTPException(status_code=404, detail="Direction not found")
    return direction

class ApplicationSubmit(BaseModel):
    user_id: int
    university_id: int
    direction_id: int
    education_level: str
    personal_info: Dict
    exam_scores: Dict
    application_file_url: Optional[str] = None

@app.post("/api/admission/apply")
async def submit_application_endpoint(
    data: ApplicationSubmit,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Подать заявление на поступление"""
    if not user_id:
        user_id = 10001  # Fallback для мок-режима
    
    # Получаем пользователя для получения внутреннего ID
    user = database.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    internal_user_id = user["id"]
    
    application_id = database.create_application(
        internal_user_id,
        data.university_id,
        data.direction_id,
        data.education_level,
        data.personal_info,
        data.exam_scores,
        data.application_file_url
    )
    
    return {"success": True, "application_id": application_id}

@app.get("/api/admission/my-applications")
async def get_my_applications_endpoint(
    user_id: int,
    header_user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Получить заявления пользователя"""
    if not header_user_id:
        header_user_id = 10001  # Fallback для мок-режима
    
    user = database.get_user(header_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    internal_user_id = user["id"]
    applications = database.get_user_applications(internal_user_id)
    
    return {"applications": applications}

@app.get("/api/admin/applications")
async def get_pending_applications_endpoint(
    university_id: int,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Получить заявления на проверку (для админов)"""
    if not user_id:
        user_id = 10001  # Fallback для мок-режима
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can view applications")
    
    applications = database.get_pending_applications(university_id)
    return {"applications": applications}

class ApplicationReview(BaseModel):
    status: str  # approved или rejected
    review_notes: Optional[str] = None

@app.post("/api/admin/applications/{application_id}/review")
async def review_application_endpoint(
    application_id: int,
    data: ApplicationReview,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Проверить заявление (принять/отклонить)"""
    if not user_id:
        user_id = 10001  # Fallback для мок-режима
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can review applications")
    
    internal_user_id = user["id"]
    
    database.review_application(application_id, internal_user_id, data.status, data.review_notes)
    
    return {"success": True, "message": f"Application {data.status}"}

# ============ STORIES API ============

STORIES_MEDIA_DIR = Path(database.DB_DIR) / "stories"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024   # 5 MB
MAX_VIDEO_BYTES = 15 * 1024 * 1024  # 15 MB
STORIES_UPLOAD_RATE_PER_HOUR = 30
STORIES_CREATE_RATE_PER_DAY = 20

_stories_upload_count: Dict[int, List[float]] = {}  # max_user_id -> list of timestamps
_stories_create_count: Dict[int, List[float]] = {}  # max_user_id -> list of (date, count) or just timestamps


def _require_stories_user(header_user_id: Optional[int]) -> Dict:
    if not header_user_id:
        header_user_id = 10001
    user = database.get_user(header_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


class StorySlideCreate(BaseModel):
    type: str  # image | video | text
    media_url: Optional[str] = None
    text: Optional[str] = None
    duration_sec: Optional[float] = None


class StoryCreate(BaseModel):
    slides: List[StorySlideCreate]
    university_id: int = 1


@app.post("/api/stories/upload-media")
async def upload_story_media(
    file: UploadFile = File(...),
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Загрузить один файл (фото/видео) для истории. Возвращает media_url для передачи в POST /api/stories."""
    _require_stories_user(user_id)
    content_type = (file.content_type or "").strip().lower()
    if content_type not in ALLOWED_IMAGE_TYPES and content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Allowed types: image/jpeg, image/png, image/webp, video/mp4")
    contents = await file.read()
    max_size = MAX_VIDEO_BYTES if content_type in ALLOWED_VIDEO_TYPES else MAX_IMAGE_BYTES
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large (max {max_size // (1024*1024)} MB)")
    ext = "jpg" if "jpeg" in content_type else "png" if "png" in content_type else "webp" if "webp" in content_type else "mp4"
    pending_dir = STORIES_MEDIA_DIR / "_pending"
    pending_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{ext}"
    path = pending_dir / name
    with open(path, "wb") as f:
        f.write(contents)
    media_url = f"stories/_pending/{name}"
    return {"media_url": media_url}


@app.post("/api/stories")
async def create_story_endpoint(
    data: StoryCreate,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Создать историю из загруженных слайдов."""
    user = _require_stories_user(user_id)
    internal_id = user["id"]
    university_id = user.get("university_id") or data.university_id
    if not data.slides:
        raise HTTPException(status_code=400, detail="At least one slide required")
    slides_data = [{"type": s.type, "media_url": s.media_url, "text": s.text, "duration_sec": s.duration_sec} for s in data.slides]
    story_id = database.create_story(internal_id, university_id, slides_data, status="published")
    base_dir = STORIES_MEDIA_DIR / str(story_id)
    base_dir.mkdir(parents=True, exist_ok=True)
    for i, slide in enumerate(data.slides):
        if slide.media_url and slide.media_url.startswith("stories/_pending/"):
            parts = slide.media_url.replace("\\", "/").split("/")
            old_path = STORIES_MEDIA_DIR / parts[1] / parts[2] if len(parts) >= 3 else STORIES_MEDIA_DIR / "_pending" / parts[-1]
            if not old_path.exists():
                old_path = STORIES_MEDIA_DIR / "_pending" / (slide.media_url.split("/")[-1] if "/" in slide.media_url else slide.media_url)
            if old_path.exists():
                ext = old_path.suffix or ".jpg"
                new_name = f"{i}{ext}"
                new_path = base_dir / new_name
                shutil.move(str(old_path), str(new_path))
                rel = f"stories/{story_id}/{new_name}"
                conn = sqlite3.connect(database.UNIVERSITIES_DB_PATH)
                cursor = conn.cursor()
                cursor.execute("UPDATE story_slides SET media_url = ? WHERE story_id = ? AND position = ?", (rel, story_id, i))
                conn.commit()
                conn.close()
    return {"success": True, "story_id": story_id}


@app.get("/api/stories/feed")
async def get_stories_feed_endpoint(
    university_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Лента историй для главной/хаба."""
    user = _require_stories_user(user_id)
    uid = user.get("university_id") or university_id or 1
    items = database.get_stories_feed(uid, limit=limit, offset=offset)
    story_ids = [s["id"] for s in items]
    reaction_counts = database.get_story_reaction_counts(story_ids)
    internal_id = user.get("id")
    user_reacted_ids = set(database.get_user_reacted_story_ids(internal_id, story_ids)) if internal_id else set()
    result = []
    for s in items:
        author = database.get_user_by_id(s["author_id"])
        result.append({
            "id": s["id"],
            "author_id": s["author_id"],
            "author_name": f"{author.get('first_name', '')} {author.get('last_name', '')}".strip() or "Пользователь" if author else "Пользователь",
            "avatar_url": author.get("photo_url") if author else None,
            "university_id": s["university_id"],
            "cover_url": s.get("cover_url"),
            "slide_count": s["slide_count"],
            "view_count": s.get("view_count", 0),
            "reaction_count": reaction_counts.get(s["id"], 0),
            "user_reacted": s["id"] in user_reacted_ids,
            "created_at": s["created_at"],
            "expires_at": s["expires_at"],
        })
    return {"stories": result}


@app.get("/api/stories/my")
async def get_my_stories_endpoint(
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Мои истории для профиля."""
    user = _require_stories_user(user_id)
    internal_id = user["id"]
    items = database.get_my_stories(internal_id)
    result = []
    for s in items:
        result.append({
            "id": s["id"],
            "cover_url": s.get("cover_url"),
            "slide_count": s["slide_count"],
            "view_count": s.get("view_count", 0),
            "created_at": s["created_at"],
            "expires_at": s["expires_at"],
        })
    return {"stories": result}


@app.get("/api/stories/media")
async def get_story_media_endpoint(path: str):
    """Отдать медиафайл истории по безопасному пути (только stories/...)."""
    safe = database.get_story_media_relative_path(path)
    if not safe:
        raise HTTPException(status_code=404, detail="Invalid path")
    rel = safe.replace("stories/", "").strip("/").replace("/", os.sep)
    full = (STORIES_MEDIA_DIR / rel).resolve()
    root = STORIES_MEDIA_DIR.resolve()
    if not full.exists() or not str(full).startswith(str(root)):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full)


@app.get("/api/stories/{story_id}")
async def get_story_endpoint(
    story_id: int,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Детали одной истории (все слайды) для просмотра."""
    user = _require_stories_user(user_id)
    story = database.get_story(story_id, include_expired=False)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found or expired")
    author = database.get_user_by_id(story["author_id"])
    slides_out = []
    for sl in story.get("slides", []):
        slides_out.append({
            "type": sl["type"],
            "media_url": sl.get("media_url"),
            "text": sl.get("text"),
            "duration_sec": sl.get("duration_sec"),
        })
    reaction_count = database.get_story_reaction_count(story_id)
    user_reacted = story_id in database.get_user_reacted_story_ids(user["id"], [story_id])

    return {
        "id": story["id"],
        "author_id": story["author_id"],
        "author_name": f"{author.get('first_name', '')} {author.get('last_name', '')}".strip() or "Пользователь" if author else "Пользователь",
        "avatar_url": author.get("photo_url") if author else None,
        "slides": slides_out,
        "view_count": story.get("view_count", 0),
        "reaction_count": reaction_count,
        "user_reacted": user_reacted,
        "created_at": story.get("created_at"),
        "expires_at": story["expires_at"],
    }


@app.post("/api/stories/{story_id}/view")
async def record_story_view_endpoint(
    story_id: int,
    slide_reached: Optional[int] = None,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Зафиксировать просмотр истории."""
    user = _require_stories_user(user_id)
    internal_id = user["id"]
    database.record_story_view(story_id, internal_id, slide_reached=slide_reached)
    return {"success": True}


@app.post("/api/stories/{story_id}/reaction")
async def toggle_story_reaction_endpoint(
    story_id: int,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Поставить или убрать реакцию на историю."""
    user = _require_stories_user(user_id)
    story = database.get_story(story_id, include_expired=False)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found or expired")
    added, new_count = database.toggle_story_reaction(story_id, user["id"])
    return {"reacted": added, "reaction_count": new_count}


@app.delete("/api/stories/{story_id}")
async def delete_story_endpoint(
    story_id: int,
    user_id: Optional[int] = Header(None, alias="X-MAX-User-ID")
):
    """Удалить свою историю."""
    user = _require_stories_user(user_id)
    internal_id = user["id"]
    if not database.delete_story(story_id, internal_id):
        raise HTTPException(status_code=404, detail="Story not found or not yours")
    import pathlib
    story_dir = STORIES_MEDIA_DIR / str(story_id)
    if story_dir.exists():
        try:
            shutil.rmtree(story_dir)
        except Exception:
            pass
    return {"success": True}

# ============ ПАНЕЛЬ СУПЕРАДМИНА ============

@app.get("/api/superadmin/universities")
async def get_all_universities_endpoint(user_id: int = Header(None, alias="X-MAX-User-ID")):
    """Получить все университеты (только для суперадминов)"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    if not database.is_superadmin(user_id):
        raise HTTPException(status_code=403, detail="Only superadmins can access this")
    
    universities = database.get_all_universities()
    return {"universities": universities}

class UniversityCreate(BaseModel):
    name: str
    short_name: str
    description: str
    admin_user_id: int  # ID пользователя, который станет админом

@app.post("/api/superadmin/universities")
async def create_university_endpoint(
    data: UniversityCreate,
    user_id: int = Header(None, alias="X-MAX-User-ID")
):
    """Создать новый университет (только для суперадминов)"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    if not database.is_superadmin(user_id):
        raise HTTPException(status_code=403, detail="Only superadmins can create universities")
    
    university_id = database.create_university(
        data.name,
        data.short_name,
        data.description,
        user_id,
        data.admin_user_id
    )
    
    return {"success": True, "university_id": university_id}

@app.post("/api/superadmin/universities/{university_id}/admin")
async def set_university_admin_endpoint(
    university_id: int,
    admin_user_id: int,
    user_id: int = Header(None, alias="X-MAX-User-ID")
):
    """Назначить администратора университета (только для суперадминов)"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    if not database.is_superadmin(user_id):
        raise HTTPException(status_code=403, detail="Only superadmins can set university admins")
    
    database.set_university_admin(university_id, admin_user_id)
    return {"success": True, "message": "University admin set"}

@app.get("/api/admin/custom-blocks/standards")
async def get_development_standards():
    """Получить стандарты разработки для кастомных блоков"""
    return {
        "standards": {
            "widget_structure": {
                "description": "Виджет должен быть React компонентом, экспортируемым по умолчанию",
                "example": """
import React from 'react';

const CustomWidget = ({ config }) => {
  return (
    <div className="widget custom-widget">
      <div className="widget-header">
        <h3 className="widget-title">{config.title || 'Custom Widget'}</h3>
      </div>
      <div className="widget-content">
        {/* Ваш контент */}
      </div>
    </div>
  );
};

export default CustomWidget;
                """.strip()
            },
            "props": {
                "config": "Объект конфигурации, переданный администратором",
                "apiService": "Сервис для работы с API (опционально)"
            },
            "styling": {
                "description": "Используйте классы .widget, .widget-header, .widget-content для базовых стилей",
                "custom_styles": "Можно добавлять собственные классы, но избегайте конфликтов"
            },
            "api_usage": {
                "description": "Для работы с API используйте apiService из props",
                "example": """
const data = await apiService.getCustomData(config.endpoint);
                """.strip()
            },
            "security": {
                "description": "Код будет проверен на безопасность перед одобрением",
                "restrictions": [
                    "Не используйте eval() или Function()",
                    "Не обращайтесь к window или document напрямую без необходимости",
                    "Не используйте внешние скрипты без одобрения"
                ]
            },
            "submission_format": {
                "code": "JavaScript/JSX код виджета",
                "config_schema": "JSON Schema для конфигурации блока",
                "name": "Название блока",
                "description": "Описание функционала"
            }
        },
        "example_config_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "default": "Custom Block"},
                "endpoint": {"type": "string"},
                "refreshInterval": {"type": "number", "default": 60}
            },
            "required": ["title"]
        }
    }

# Инициализация баз данных при запуске
database.init_databases()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
