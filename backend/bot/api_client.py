"""
Официальный клиент MAX Bot API (Python).

Соответствует официальной библиотеке @maxhub/max-bot-api (TypeScript).
Документация: https://dev.max.ru/docs-api
Референс по событиям и методам: docs/external_docs.md

Методы API (как в TS):
  - sendMessageToUser(user_id, text, options) -> send_message(user_id, text, ...)
  - sendMessageToChat(chat_id, text) -> send_message(chat_id, text, ...)
События вебхука: message_created, message_callback (нажатие callback-кнопки).
Клавиатура: callback (payload), link (url), open_app (web_app.url).
"""
import os
import httpx
from typing import Optional, Dict, List, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def _get_bot_token() -> str:
    """Получить токен бота из env или .env.bot"""
    token = (os.environ.get("MAX_BOT_TOKEN") or "").strip()
    if token:
        return token
    try:
        backend_dir = Path(__file__).resolve().parent.parent
        for name in (".env.bot", ".env"):
            p = backend_dir / name
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


class MAXBotAPIClient:
    """
    Официальный клиент для работы с MAX Bot API.
    Документация: https://dev.max.ru/docs-api
    """
    
    def __init__(self, token: Optional[str] = None):
        self.token = token or _get_bot_token()
        self.base_url = os.environ.get("MAX_BOT_API_BASE", "https://platform-api.max.ru")
        self.headers = {
            "Authorization": self.token.strip(),
            "Content-Type": "application/json"
        }
        if not self.token:
            logger.warning("MAX_BOT_TOKEN not set - bot API calls will fail")
    
    def _reply_markup_to_attachments(self, reply_markup: Dict) -> List[Dict]:
        """
        Конвертирует inline_keyboard в формат MAX API attachments.
        Формат MAX: attachments с type="inline_keyboard" и payload.buttons.
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
                    max_row.append({
                        "type": "callback",
                        "text": text,
                        "payload": btn["callback_data"]
                    })
                elif btn.get("url"):
                    max_row.append({
                        "type": "link",
                        "text": text,
                        "url": btn["url"]
                    })
                elif btn.get("web_app") and isinstance(btn["web_app"], dict):
                    max_row.append({
                        "type": "open_app",
                        "text": text,
                        "url": btn["web_app"].get("url", "")
                    })
            if max_row:
                buttons.append(max_row)
        
        return [{"type": "inline_keyboard", "payload": {"buttons": buttons}}] if buttons else []
    
    async def send_message(
        self,
        user_id: int,
        text: str,
        reply_markup: Optional[Dict] = None,
        format: str = "markdown"
    ) -> Dict[str, Any]:
        """
        Отправка сообщения через официальный MAX Bot API.
        
        Args:
            user_id: ID пользователя MAX
            text: Текст сообщения
            reply_markup: Inline клавиатура (dict с inline_keyboard)
            format: Формат текста (markdown по умолчанию)
        
        Returns:
            Ответ от API или пустой dict при ошибке
        """
        if not self.token:
            logger.error("Cannot send message: MAX_BOT_TOKEN not set")
            return {}
        
        attachments = self._reply_markup_to_attachments(reply_markup) if reply_markup else []
        
        # Пробуем platform-api.max.ru (официальный API)
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Пробуем с chat_id и user_id
            for key in ("chat_id", "user_id"):
                payload = {
                    key: user_id,
                    "text": text,
                    "format": format
                }
                if attachments:
                    payload["attachments"] = attachments
                
                try:
                    response = await client.post(
                        f"{self.base_url}/messages",
                        headers=self.headers,
                        json=payload
                    )
                    if response.status_code in (200, 201):
                        return response.json() if response.content else {}
                except Exception as e:
                    logger.debug(f"Failed to send via {key}: {e}")
                    continue
            
            # Fallback на старый endpoint
            payload_fb = {
                "user_id": user_id,
                "text": text
            }
            if reply_markup:
                payload_fb["reply_markup"] = reply_markup
            
            try:
                response = await client.post(
                    "https://api.max.ru/bot/sendMessage",
                    headers=self.headers,
                    json=payload_fb
                )
                if response.status_code in (200, 201):
                    return response.json() if response.content else {}
            except Exception as e:
                logger.error(f"Failed to send message via fallback: {e}")
        
        return {}

    async def send_message_to_user(
        self,
        user_id: int,
        text: str,
        reply_markup: Optional[Dict] = None,
        format: str = "markdown",
        **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Отправить сообщение пользователю (аналог bot.api.sendMessageToUser в @maxhub/max-bot-api).
        """
        return await self.send_message(user_id=user_id, text=text, reply_markup=reply_markup, format=format)

    async def send_message_to_chat(
        self,
        chat_id: int,
        text: str,
        reply_markup: Optional[Dict] = None,
        format: str = "markdown",
        **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Отправить сообщение в чат (аналог bot.api.sendMessageToChat в @maxhub/max-bot-api).
        В MAX для личного чата с пользователем chat_id может совпадать с user_id.
        """
        return await self.send_message(user_id=chat_id, text=text, reply_markup=reply_markup, format=format)
    
    async def edit_message_text(
        self,
        user_id: int,
        message_id: int,
        text: str,
        reply_markup: Optional[Dict] = None,
        format: str = "markdown"
    ) -> Dict[str, Any]:
        """
        Редактирование сообщения через официальный MAX Bot API.
        
        Args:
            user_id: ID пользователя MAX
            message_id: ID сообщения для редактирования
            text: Новый текст сообщения
            reply_markup: Новая inline клавиатура
            format: Формат текста
        
        Returns:
            Ответ от API или пустой dict при ошибке
        """
        if not self.token:
            logger.error("Cannot edit message: MAX_BOT_TOKEN not set")
            return {}
        
        attachments = self._reply_markup_to_attachments(reply_markup) if reply_markup else []
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            payload = {
                "text": text,
                "format": format
            }
            if attachments:
                payload["attachments"] = attachments
            
            try:
                response = await client.put(
                    f"{self.base_url}/messages/{message_id}",
                    headers=self.headers,
                    json=payload
                )
                if response.status_code in (200, 201):
                    return response.json() if response.content else {}
            except Exception as e:
                logger.debug(f"Failed to edit via platform-api: {e}")
            
            # Fallback
            payload_fb = {
                "user_id": user_id,
                "message_id": message_id,
                "text": text
            }
            if reply_markup:
                payload_fb["reply_markup"] = reply_markup
            
            try:
                response = await client.post(
                    "https://api.max.ru/bot/editMessageText",
                    headers=self.headers,
                    json=payload_fb
                )
                if response.status_code in (200, 201):
                    return response.json() if response.content else {}
            except Exception as e:
                logger.error(f"Failed to edit message via fallback: {e}")
        
        return {}
    
    async def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False
    ) -> Dict[str, Any]:
        """
        Ответ на callback query (нажатие inline кнопки).
        
        Args:
            callback_query_id: ID callback query
            text: Текст ответа (опционально)
            show_alert: Показать как alert (опционально)
        
        Returns:
            Ответ от API
        """
        if not self.token:
            logger.error("Cannot answer callback: MAX_BOT_TOKEN not set")
            return {}
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            payload = {
                "callback_query_id": callback_query_id
            }
            if text:
                payload["text"] = text
            payload["show_alert"] = show_alert
            
            try:
                response = await client.post(
                    f"{self.base_url}/answerCallbackQuery",
                    headers=self.headers,
                    json=payload
                )
                return response.json() if response.content else {}
            except Exception as e:
                logger.error(f"Failed to answer callback query: {e}")
                return {}


# Глобальный экземпляр клиента
_bot_client: Optional[MAXBotAPIClient] = None


def get_bot_client() -> MAXBotAPIClient:
    """Получить глобальный экземпляр клиента бота"""
    global _bot_client
    if _bot_client is None:
        _bot_client = MAXBotAPIClient()
    return _bot_client
