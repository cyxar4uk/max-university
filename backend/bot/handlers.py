"""
Обработчики команд и callback для бота MAX через вебхук (официальный API).
"""
import database
from datetime import datetime
from typing import Dict, Any, Optional
from .api_client import get_bot_client
from .keyboards import (
    get_role_selection_keyboard,
    get_welcome_open_app_keyboard,
    get_main_menu_keyboard,
    get_quick_actions_keyboard
)


def get_role_name(role: str) -> str:
    """Получить красивое название роли"""
    roles = {
        "parent": "Родитель",
        "applicant": "Абитуриент",
        "student": "Студент",
        "teacher": "Преподаватель",
        "employee": "Сотрудник",
        "admin": "Администратор",
    }
    return roles.get(role, role)


def _parse_webhook_body(body: Dict) -> tuple[Optional[int], Optional[str], Dict]:
    """
    Извлечь user_id, text и user_data из вебхука MAX.
    Поддерживает форматы как в @maxhub/max-bot-api (docs/external_docs.md):
    - message_created: body.message или body.msg
    - message_callback: обрабатывается отдельно в handle_callback
    """
    user_id = None
    text = None
    user_data = {}
    
    # Пробуем разные варианты структуры вебхука (в т.ч. event + message как в TS lib)
    message = body.get("message") or body.get("msg") or body
    
    # Извлечение user_id
    if "from" in message:
        user_id = message["from"].get("id") or message["from"].get("user_id")
    elif "sender" in message:
        user_id = message["sender"].get("id") or message["sender"].get("user_id")
    elif "sender_id" in body:
        user_id = body["sender_id"]
    elif "user_id" in body:
        user_id = body["user_id"]
    
    # Извлечение text
    if "text" in message:
        text = message["text"]
    elif "body" in message and isinstance(message["body"], dict):
        text = message["body"].get("text")
    elif "text" in body:
        text = body["text"]
    
    # Извлечение user_data
    if "from" in message:
        from_data = message["from"]
        user_data = {
            "first_name": from_data.get("first_name", ""),
            "last_name": from_data.get("last_name"),
            "username": from_data.get("username"),
            "language_code": from_data.get("language_code"),
        }
    elif "sender" in message:
        sender_data = message["sender"]
        user_data = {
            "first_name": sender_data.get("first_name", ""),
            "last_name": sender_data.get("last_name"),
            "username": sender_data.get("username"),
            "language_code": sender_data.get("language_code"),
        }
    
    try:
        user_id = int(user_id) if user_id is not None else None
    except (TypeError, ValueError):
        user_id = None
    
    text = (text or "").strip()
    return user_id, text, user_data


async def handle_webhook_update(body: Dict[str, Any]):
    """
    Главный обработчик вебхука от MAX Bot API.
    Соответствует событиям из @maxhub/max-bot-api (docs/external_docs.md):
    - message_callback — нажатие callback-кнопки (payload)
    - message_created — новое сообщение (в т.ч. команды)
    """
    bot_client = get_bot_client()
    
    # Обработка callback (нажатие inline-кнопки) — событие message_callback в TS lib
    callback = body.get("callback_query") or body.get("message_callback")
    if callback and isinstance(callback, dict):
        await handle_callback(bot_client, callback)
        return
    
    # Обработка сообщения
    user_id, text, user_data = _parse_webhook_body(body)
    if not user_id or not text:
        return
    
    # Нормализуем команду (добавляем / если нужно)
    cmd = (text.split()[0] if text else "").lower()
    if not cmd.startswith("/"):
        cmd = "/" + cmd
    
    # Обработка команд
    if cmd == "/start":
        await handle_start_command(bot_client, user_id, user_data)
    elif cmd == "/help":
        await handle_help_command(bot_client, user_id)
    elif cmd == "/schedule":
        await handle_schedule_command(bot_client, user_id)
    elif cmd == "/profile":
        await handle_profile_command(bot_client, user_id)
    else:
        # Неизвестная команда или текст
        await bot_client.send_message(
            user_id=user_id,
            text="Я не знаю такой команды.\n\nИспользуйте /start или /help."
        )


async def handle_start_command(bot_client, user_id: int, user_data: Dict):
    """
    Обработка команды /start: создаём/обновляем пользователя в БД,
    при первом запуске — выбор роли (клавиатура); иначе приветствие + меню.
    """
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
    
    if not role:
        # Первый запуск - выбор роли
        text = (
            f"👋 Привет, {first_name or 'друг'}!\n\n"
            "Добро пожаловать в **Цифровой университет** на платформе MAX.\n\n"
            "Выберите свою роль — затем откроется приложение:"
        )
        await bot_client.send_message(
            user_id=user_id,
            text=text,
            reply_markup=get_role_selection_keyboard()
        )
    else:
        # Повторный запуск - приветствие и меню
        text = (
            f"👋 Привет, {first_name or 'друг'}!\n\n"
            "Добро пожаловать в **Цифровой университет**.\n\n"
            "Нажмите кнопку ниже, чтобы открыть приложение:"
        )
        await bot_client.send_message(
            user_id=user_id,
            text=text,
            reply_markup=get_welcome_open_app_keyboard(role)
        )
        menu_text = f"Или выберите раздел:\n\nВаша роль: {get_role_name(role)}"
        await bot_client.send_message(
            user_id=user_id,
            text=menu_text,
            reply_markup=get_main_menu_keyboard(role)
        )


async def handle_help_command(bot_client, user_id: int):
    """Обработка команды /help"""
    text = """📚 **Доступные команды:**

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
/news - Последние новости"""
    await bot_client.send_message(user_id=user_id, text=text)


async def handle_schedule_command(bot_client, user_id: int):
    """Обработка команды /schedule"""
    await bot_client.send_message(
        user_id=user_id,
        text="📅 Расписание",
        reply_markup=get_quick_actions_keyboard("schedule")
    )


async def handle_profile_command(bot_client, user_id: int):
    """Обработка команды /profile"""
    existing = database.get_user(user_id)
    if existing:
        role = existing.get("role", "не выбрана")
        text = (
            f"👤 Профиль\n\n"
            f"Имя: {existing.get('first_name', '')} {existing.get('last_name', '')}\n"
            f"Роль: {get_role_name(role)}"
        )
    else:
        text = "👤 Профиль\n\nВы не зарегистрированы. Используйте /start"
    await bot_client.send_message(
        user_id=user_id,
        text=text,
        reply_markup=get_quick_actions_keyboard("profile")
    )


async def handle_callback(bot_client, callback: Dict):
    """Обработка callback от inline-кнопок"""
    callback_query_id = callback.get("id") or callback.get("query_id") or ""
    from_info = callback.get("from") or callback.get("user") or {}
    user_id = from_info.get("id") or from_info.get("user_id")
    callback_data = str(callback.get("data") or callback.get("payload") or "")
    msg = callback.get("message") or {}
    message_id = msg.get("message_id") or msg.get("mid") or msg.get("id")
    
    try:
        user_id = int(user_id) if user_id is not None else None
        message_id = int(message_id) if message_id is not None else None
    except (TypeError, ValueError):
        return
    
    if not user_id or not callback_data:
        return
    
    # Обработка выбора роли
    if callback_data.startswith("role_"):
        role = callback_data.split("_", 1)[1]
        existing = database.get_user(user_id)
        if not existing:
            database.create_user({
                "max_user_id": user_id,
                "first_name": "",
                "last_name": "",
                "username": None,
                "photo_url": None,
                "language_code": None,
                "role": role,
                "university_id": 1,
            })
        else:
            database.update_user_role(user_id, role, 1)
        
        await bot_client.answer_callback_query(
            callback_query_id=callback_query_id,
            text=f"Роль выбрана: {get_role_name(role)}"
        )
        
        text = (
            f"✅ Вы выбрали роль: **{get_role_name(role)}**\n\n"
            "Нажмите кнопку ниже, чтобы открыть приложение — в нём будут сохранены ваше имя, фамилия и роль."
        )
        if message_id:
            await bot_client.edit_message_text(
                user_id=user_id,
                message_id=message_id,
                text=text,
                reply_markup=get_welcome_open_app_keyboard(role)
            )
        else:
            await bot_client.send_message(
                user_id=user_id,
                text=text,
                reply_markup=get_welcome_open_app_keyboard(role)
            )
    
    # Обработка выбора блока
    elif callback_data.startswith("block_"):
        block = callback_data.split("_", 1)[1]
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
        
        await bot_client.answer_callback_query(
            callback_query_id=callback_query_id,
            text=f"Открываю {block_names.get(block, block)}"
        )
        
        text = f"**{block_names.get(block, block)}**\n\nВыберите действие или откройте полную версию в приложении:"
        
        if message_id:
            await bot_client.edit_message_text(
                user_id=user_id,
                message_id=message_id,
                text=text,
                reply_markup=get_quick_actions_keyboard(block)
            )
        else:
            await bot_client.send_message(
                user_id=user_id,
                text=text,
                reply_markup=get_quick_actions_keyboard(block)
            )
    
    # Возврат в меню
    elif callback_data == "back_to_menu":
        existing = database.get_user(user_id)
        role = (existing or {}).get("role", "student")
        
        await bot_client.answer_callback_query(
            callback_query_id=callback_query_id,
            text="Возвращаюсь в меню"
        )
        
        text = "📱 Главное меню\n\nВыберите раздел:"
        if message_id:
            await bot_client.edit_message_text(
                user_id=user_id,
                message_id=message_id,
                text=text,
                reply_markup=get_main_menu_keyboard(role)
            )
        else:
            await bot_client.send_message(
                user_id=user_id,
                text=text,
                reply_markup=get_main_menu_keyboard(role)
            )
