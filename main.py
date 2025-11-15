from fastapi import FastAPI, HTTPException, Header, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import json
import hmac
import hashlib
import httpx
from datetime import datetime
import database

app = FastAPI(title="Digital University MAX Bot + Mini-App", version="2.0.0")

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

# MAX Bot API Token (один и тот же для бота и mini-app)
MAX_BOT_TOKEN = "f9LHodD0cOI5MJfQ6eqCiVzCVUt8Va__S2Nzwvj06nK6_VfYt4Ra9Sp04TSWBpi5vi_XOuNQ9MNBrHU6hsIu"
MAX_API_BASE = "https://api.max.ru/bot"

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
    """Входящее обновление от MAX Bot"""
    update_id: int
    message: Optional[Dict] = None
    callback_query: Optional[Dict] = None

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
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    async def send_message(
        self, 
        user_id: int, 
        text: str, 
        reply_markup: Optional[Dict] = None
    ):
        """Отправка сообщения пользователю"""
        async with httpx.AsyncClient() as client:
            payload = {
                "user_id": user_id,
                "text": text,
            }
            if reply_markup:
                payload["reply_markup"] = reply_markup
            
            response = await client.post(
                f"{self.base_url}/sendMessage",
                headers=self.headers,
                json=payload
            )
            return response.json()
    
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
        """Редактирование сообщения"""
        async with httpx.AsyncClient() as client:
            payload = {
                "user_id": user_id,
                "message_id": message_id,
                "text": text,
            }
            if reply_markup:
                payload["reply_markup"] = reply_markup
            
            response = await client.post(
                f"{self.base_url}/editMessageText",
                headers=self.headers,
                json=payload
            )
            return response.json()

bot_api = MAXBotAPI(MAX_BOT_TOKEN)

# ============ INLINE КЛАВИАТУРЫ ============

def get_role_selection_keyboard() -> Dict:
    """Клавиатура выбора роли"""
    return {
        "inline_keyboard": [
            [
                {"text": "👨‍🎓 Студент", "callback_data": "role_student"},
                {"text": "🎯 Абитуриент", "callback_data": "role_applicant"}
            ],
            [
                {"text": "👔 Сотрудник", "callback_data": "role_employee"},
                {"text": "⚙️ Администратор", "callback_data": "role_admin"}
            ]
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
                    {"text": "🌐 Открыть приложение", "web_app": {"url": "https://cyxar4uk.github.io/max-university/?role=applicant"}}
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
                    {"text": "🌐 Панель администратора", "web_app": {"url": "https://cyxar4uk.github.io/max-university/?role=admin"}}
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
    """Обработка команды /start"""
    
    # Проверяем, есть ли уже роль у пользователя
    if user_id in users_db and users_db[user_id].get("role"):
        role = users_db[user_id]["role"]
        text = f"С возвращением, {user_data.get('first_name', 'пользователь')}!\n\n" \
               f"Ваша роль: {get_role_name(role)}\n\n" \
               f"Выберите раздел или откройте приложение:"
        
        await bot_api.send_message(
            user_id=user_id,
            text=text,
            reply_markup=get_main_menu_keyboard(role)
        )
    else:
        # Первый запуск - выбор роли
        text = f"👋 Привет, {user_data.get('first_name', 'пользователь')}!\n\n" \
               f"Добро пожаловать в **Цифровой университет** на платформе MAX!\n\n" \
               f"Для начала, выберите свою роль:"
        
        await bot_api.send_message(
            user_id=user_id,
            text=text,
            reply_markup=get_role_selection_keyboard()
        )

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
    """Обработка выбора роли"""
    
    # Сохраняем роль
    if user_id not in users_db:
        users_db[user_id] = {}
    
    users_db[user_id]["role"] = role
    users_db[user_id]["selected_at"] = datetime.now().isoformat()
    
    # Отвечаем на callback
    await bot_api.answer_callback_query(
        callback_query_id=callback_query_id,
        text=f"Роль выбрана: {get_role_name(role)}"
    )
    
    # Редактируем сообщение с главным меню
    text = f"✅ Отлично! Вы выбрали роль: **{get_role_name(role)}**\n\n" \
           f"Теперь выберите нужный раздел:"
    
    await bot_api.edit_message_text(
        user_id=user_id,
        message_id=message_id,
        text=text,
        reply_markup=get_main_menu_keyboard(role)
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

@app.post("/api/bot/webhook")
async def bot_webhook(update: BotUpdate, background_tasks: BackgroundTasks):
    """
    Вебхук для получения обновлений от MAX Bot
    """
    
    try:
        # Обработка обычного сообщения
        if update.message:
            message = update.message
            user_id = message.get("from", {}).get("id")
            text = message.get("text", "")
            user_data = message.get("from", {})
            
            # Обработка команд
            if text.startswith("/start"):
                await handle_start_command(user_id, user_data)
            
            elif text.startswith("/help"):
                await handle_help_command(user_id)
            
            elif text.startswith("/schedule"):
                role = users_db.get(user_id, {}).get("role", "student")
                await bot_api.send_message(
                    user_id=user_id,
                    text="📅 Расписание",
                    reply_markup=get_quick_actions_keyboard("schedule")
                )
            
            elif text.startswith("/profile"):
                await bot_api.send_message(
                    user_id=user_id,
                    text="👤 Профиль",
                    reply_markup=get_quick_actions_keyboard("profile")
                )
        
        # Обработка callback query (нажатия на inline кнопки)
        elif update.callback_query:
            callback = update.callback_query
            callback_query_id = callback.get("id")
            user_id = callback.get("from", {}).get("id")
            callback_data = callback.get("data")
            message_id = callback.get("message", {}).get("message_id")
            
            # Обработка выбора роли
            if callback_data.startswith("role_"):
                role = callback_data.split("_")[1]
                await handle_role_selection(user_id, callback_query_id, role, message_id)
            
            # Обработка выбора блока
            elif callback_data.startswith("block_"):
                block = callback_data.split("_")[1]
                await handle_block_selection(user_id, callback_query_id, block, message_id)
            
            # Возврат в меню
            elif callback_data == "back_to_menu":
                await handle_back_to_menu(user_id, callback_query_id, message_id)
            
            # Быстрые действия
            elif callback_data.startswith("schedule_"):
                action = callback_data.split("_")[1]
                # Здесь логика для каждого действия
                await bot_api.answer_callback_query(
                    callback_query_id=callback_query_id,
                    text=f"Действие: {action}"
                )
        
        return {"status": "ok"}
    
    except Exception as e:
        print(f"Error processing update: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

def get_role_name(role: str) -> str:
    """Получить красивое название роли"""
    roles = {
        "student": "Студент",
        "applicant": "Абитуриент",
        "employee": "Сотрудник",
        "admin": "Администратор"
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
    """
    if not x_max_user_id:
        raise HTTPException(status_code=401, detail="User ID not provided")
    
    try:
        return int(x_max_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

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
    
    # Проверяем наличие пользователя в БД
    existing_user = database.get_user(user.max_user_id)
    if existing_user:
        return {
            "user": existing_user,
            "new_user": False,
            "message": "User already exists"
        }
    
    # Создаём нового пользователя в БД
    user_data = {
        "max_user_id": user.max_user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "photo_url": user.photo_url,
        "language_code": user.language_code,
        "role": user.role,
        "university_id": user.university_id or 1
    }
    new_user = database.create_user(user_data)
    
    return {
        "user": new_user,
        "new_user": True,
        "message": "User created successfully"
    }

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
    
    valid_roles = ["student", "applicant", "employee", "admin"]
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
    valid_roles = ["student", "applicant", "employee", "admin"]
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
async def get_schedule(date: Optional[str] = None, user_id: Optional[int] = None):
    """
    Получение расписания пользователя
    Моковые данные для разных ролей
    """
    # Получаем роль пользователя если есть
    role = None
    if user_id:
        user = database.get_user(user_id)
        if user:
            role = user.get("role")
    
    # Моковые данные расписания для студентов
    mock_schedule_student = [
        {
            "id": 1,
            "time": "09:00-10:30",
            "subject": "Математический анализ",
            "room": "Аудитория 401",
            "teacher": "Иванов И.И.",
            "type": "Лекция"
        },
        {
            "id": 2,
            "time": "10:45-12:15",
            "subject": "Программирование",
            "room": "Компьютерный класс 305",
            "teacher": "Петров П.П.",
            "type": "Практика"
        },
        {
            "id": 3,
            "time": "13:00-14:30",
            "subject": "Базы данных",
            "room": "Аудитория 502",
            "teacher": "Сидорова С.С.",
            "type": "Семинар"
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
    else:
        mock_schedule = mock_schedule_student
    
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

@app.get("/api/events")
async def get_events():
    """
    Получение списка событий университета
    """
    mock_events = [
        {
            "id": 1,
            "title": "Открытая лекция по AI",
            "date": "2025-11-15",
            "time": "18:00",
            "location": "Аудитория 100",
            "participants": 25
        },
        {
            "id": 2,
            "title": "Карьерный форум",
            "date": "2025-11-20",
            "time": "10:00",
            "location": "Актовый зал",
            "participants": 150
        }
    ]
    
    return {"events": mock_events}

@app.post("/api/events/{event_id}/register")
async def register_for_event(event_id: int, user_id: Optional[int] = None):
    """
    Регистрация на событие
    """
    return {
        "status": "registered",
        "event_id": event_id,
        "user_id": user_id or 12345,
        "message": "Successfully registered for event"
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
async def use_invitation_code_endpoint(data: InvitationCodeUse, user_id: int = Header(None, alias="X-MAX-User-ID")):
    """Использовать код приглашения"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    result = database.use_invitation_code(data.code, user_id)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation code")
    
    # Обновляем пользователя
    user = database.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    database.update_user_with_invitation_code(
        user_id,
        result["code_id"],
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
    user_id: int = Header(None, alias="X-MAX-User-ID")
):
    """Сгенерировать коды приглашения"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can generate codes")
    
    codes = database.generate_invitation_codes_batch(
        data.university_id,
        data.role,
        user_id,
        data.count
    )
    
    return {"success": True, "codes": codes, "count": len(codes)}

@app.get("/api/admin/invitation-codes")
async def get_invitation_codes_endpoint(
    university_id: int,
    used: Optional[bool] = None,
    user_id: int = Header(None, alias="X-MAX-User-ID")
):
    """Получить коды приглашения"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
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
    user_id: int = Header(None, alias="X-MAX-User-ID")
):
    """Импортировать студентов и сгенерировать коды"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    user = database.get_user(user_id)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only university admins can import students")
    
    results = database.import_students_and_generate_codes(
        data.university_id,
        user_id,
        data.students
    )
    
    return {"success": True, "results": results, "count": len(results)}

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
