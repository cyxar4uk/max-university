"""
Модуль чат-бота для MAX на базе официального MAX Bot API.
Бот работает через вебхук (как указано в PRESENTATION_GUIDE.md).
"""
from .api_client import get_bot_client, MAXBotAPIClient
from .handlers import handle_webhook_update

__all__ = ["get_bot_client", "MAXBotAPIClient", "handle_webhook_update"]
