"""
Клавиатуры для бота MAX (inline-кнопки).
Используются с официальным MAX Bot API через вебхук.
Формат: dict с inline_keyboard для reply_markup.
"""
import os
from typing import Dict

MINI_APP_URL = os.environ.get("MINI_APP_URL", "").rstrip("/") or "https://cyxar4uk.github.io/max-university"


def get_role_selection_keyboard() -> Dict:
    """Клавиатура выбора роли при первом запуске бота."""
    return {
        "inline_keyboard": [
            [
                {"text": "👨‍👩‍👧 Родитель", "callback_data": "role_parent"},
                {"text": "🎯 Абитуриент", "callback_data": "role_applicant"}
            ],
            [{"text": "👨‍🎓 Студент", "callback_data": "role_student"}],
            [
                {"text": "👔 Преподаватель", "callback_data": "role_teacher"},
                {"text": "🏢 Сотрудник", "callback_data": "role_employee"}
            ],
        ]
    }


def get_welcome_open_app_keyboard(role: str = "") -> Dict:
    """Клавиатура с кнопкой «Открыть приложение»."""
    url = f"{MINI_APP_URL}?role={role}" if role else MINI_APP_URL
    return {
        "inline_keyboard": [
            [{"text": "Открыть приложение", "web_app": {"url": url}}]
        ]
    }


def get_main_menu_keyboard(role: str) -> Dict:
    """Главное меню в зависимости от роли."""
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
                [{"text": "🌐 Открыть приложение", "web_app": {"url": f"{MINI_APP_URL}?role=student"}}]
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
                [{"text": "🌐 Открыть приложение", "web_app": {"url": f"{MINI_APP_URL}?role=applicant"}}]
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
                [{"text": "🌐 Открыть приложение", "web_app": {"url": f"{MINI_APP_URL}?role=parent"}}]
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
                [{"text": "🌐 Открыть приложение", "web_app": {"url": f"{MINI_APP_URL}?role=teacher"}}]
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
                [{"text": "🌐 Открыть приложение", "web_app": {"url": f"{MINI_APP_URL}?role=employee"}}]
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
                [{"text": "🌐 Панель администратора", "web_app": {"url": f"{MINI_APP_URL}?role=admin"}}]
            ]
        }
    }
    return keyboards.get(role, keyboards["student"])


def get_quick_actions_keyboard(action: str) -> Dict:
    """Быстрые действия для каждого блока."""
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
                [{"text": "🌐 Открыть полное расписание", "web_app": {"url": f"{MINI_APP_URL}/schedule"}}],
                [{"text": "« Назад в меню", "callback_data": "back_to_menu"}]
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
                [{"text": "🌐 Открыть LMS", "web_app": {"url": f"{MINI_APP_URL}/courses"}}],
                [{"text": "« Назад в меню", "callback_data": "back_to_menu"}]
            ]
        },
        "profile": {
            "inline_keyboard": [
                [
                    {"text": "🎓 Студенческий билет", "callback_data": "profile_card"},
                    {"text": "📊 Статистика", "callback_data": "profile_stats"}
                ],
                [{"text": "⚙️ Настройки", "callback_data": "profile_settings"}],
                [{"text": "🌐 Открыть профиль", "web_app": {"url": f"{MINI_APP_URL}/profile"}}],
                [{"text": "« Назад в меню", "callback_data": "back_to_menu"}]
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
                [{"text": "🌐 Все услуги", "web_app": {"url": f"{MINI_APP_URL}/services"}}],
                [{"text": "« Назад в меню", "callback_data": "back_to_menu"}]
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
                [{"text": "🌐 Вся внеучебка", "web_app": {"url": f"{MINI_APP_URL}/events"}}],
                [{"text": "« Назад в меню", "callback_data": "back_to_menu"}]
            ]
        }
    }
    return keyboards.get(action, get_main_menu_keyboard("student"))
