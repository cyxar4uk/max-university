"""
Парсер каналов MAX для сбора новостных постов.
Аналогичен Telegram-парсеру из services/cold-news.
"""

import asyncio
import os
import logging
from datetime import datetime
from typing import Dict, Optional

from pymax import SocketMaxClient, MaxClient
from pymax.filters import Filters
from pymax.types import Message, Chat
from pymax.static.enum import ChatType
from pymax.payloads import UserAgentPayload
from dotenv import load_dotenv

from models import save_post, get_all_themes, clean_old_posts
from classifier import classify_post
from channels_config import update_channels_list

# Загрузка переменных окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MaxChannelParser:
    """Парсер каналов MAX для мониторинга и сохранения постов"""
    
    def __init__(self):
        self.client: Optional[SocketMaxClient | MaxClient] = None
        self.channels_cache: Dict[int, Dict] = {}
        self.is_monitoring = False
        
    async def initialize(self):
        """Инициализация клиента MAX"""
        phone = os.getenv("MAX_PHONE")
        if not phone:
            raise ValueError("MAX_PHONE не указан в переменных окружения")
        
        work_dir = os.getenv("MAX_WORK_DIR", "./cache")
        use_socket = os.getenv("MAX_USE_SOCKET", "true").lower() == "true"
        
        # Используем SocketMaxClient для входа по номеру телефона
        # или MaxClient для входа по QR-коду
        if use_socket:
            logger.info("Использование SocketMaxClient (вход по номеру телефона)")
            self.client = SocketMaxClient(
                phone=phone,
                work_dir=work_dir,
                headers=UserAgentPayload(device_type="DESKTOP", app_version="25.12.13")
            )
        else:
            logger.info("Использование MaxClient (вход по QR-коду)")
            self.client = MaxClient(
                phone=phone,
                work_dir=work_dir,
                headers=UserAgentPayload(device_type="WEB", app_version="25.12.13")
            )
        
        # Регистрируем обработчики после создания клиента, но до start()
        self._register_handlers()
        
        await self.client.start()
        
        if self.client.me:
            logger.info(f"✅ MAX клиент запущен. ID: {self.client.me.id}")
        else:
            logger.info("✅ MAX клиент запущен")
        
    def _register_handlers(self):
        """Регистрация обработчиков событий"""
        
        @self.client.on_start
        async def on_start():
            """Обработчик старта клиента"""
            logger.info("🚀 Парсер MAX запущен")
            await self.load_channels()
            await clean_old_posts()
        
        # Используем фильтр для каналов или проверку в обработчике
        # Если Filters.chat_type не поддерживается, используем проверку chat_type в обработчике
        @self.client.on_message()
        async def handle_channel_message(message: Message):
            """Обработка сообщений из каналов"""
            if not message.text:
                return
            
            # Получаем информацию о чате
            try:
                chat = await self.client.get_chat(message.chat_id)
                # Проверяем, что это канал
                if chat.chat_type != ChatType.CHANNEL:
                    return
                
                # Проверяем, что это канал из нашего списка
                if message.chat_id not in self.channels_cache:
                    # Если канала нет в кэше, добавляем его
                    self.channels_cache[message.chat_id] = {
                        'id': chat.id_,
                        'title': chat.title or "Без названия",
                        'username': getattr(chat, 'username', None),
                        'link': chat.link
                    }
                    logger.info(f"🔎 Новый канал обнаружен: {chat.title}")
                
                channel = self.channels_cache[message.chat_id]
                logger.info(f"📩 Пост из канала '{channel['title']}': {message.text[:50]}...")
                
                # Обработка и сохранение сообщения
                await self.process_message(message, channel)
                
            except Exception as e:
                logger.debug(f"Ошибка при обработке сообщения: {e}")
        
        @self.client.on_chat_update
        async def handle_chat_update(chat: Chat):
            """Обработка обновлений информации о чате"""
            if chat.chat_type == ChatType.CHANNEL and chat.id_ in self.channels_cache:
                self.channels_cache[chat.id_] = {
                    'id': chat.id_,
                    'title': chat.title or "Без названия",
                    'username': getattr(chat, 'username', None),
                    'link': chat.link
                }
                logger.debug(f"Обновлена информация о канале: {chat.title}")
        
    async def load_channels(self):
        """Загрузка списка каналов для мониторинга"""
        try:
            # Получаем все чаты
            chats = await self.client.fetch_chats()
            logger.info(f"Получено {len(chats)} чатов")
            
            # Фильтруем только каналы
            channels = [chat for chat in chats if chat.chat_type == ChatType.CHANNEL]
            
            # Обновляем кэш
            self.channels_cache.clear()
            for channel in channels:
                self.channels_cache[channel.id_] = {
                    'id': channel.id_,
                    'title': channel.title or "Без названия",
                    'username': getattr(channel, 'username', None),
                    'link': channel.link
                }
                logger.info(f"🔎 Канал добавлен: {channel.title} (ID: {channel.id_})")
            
            logger.info(f"📊 Всего каналов для мониторинга: {len(self.channels_cache)}")
            
            # Если каналов нет, предупреждаем
            if len(self.channels_cache) == 0:
                logger.warning("⚠️ Не найдено каналов для мониторинга. Убедитесь, что аккаунт подписан на каналы.")
            
        except Exception as e:
            logger.error(f"⚠️ Ошибка загрузки каналов: {e}")
    
    async def process_message(self, message: Message, channel: Dict):
        """Обработка и сохранение сообщения"""
        try:
            # Получаем список всех тем из БД
            all_themes = await get_all_themes()
            
            if not all_themes:
                logger.warning("⚠️ Список тем пуст, используем тему 'другое'")
                all_themes = ["другое"]
            
            # Классификация через GigaChat
            themes = await classify_post(message.text, all_themes)
            logger.debug(f"Извлечённые темы: {themes}")
            
            # Если только "другое" - не сохраняем
            if len(themes) == 1 and themes[0] == "другое":
                logger.debug(f"⏭️ Пост пропущен (тема 'другое')")
                return
            
            # Формируем данные поста
            post_data = {
                'text': message.text,
                'date': datetime.fromtimestamp(message.time) if message.time else datetime.now(),
                'channel': channel['title'],
                'channelUsername': channel.get('username', ''),
                'channelId': str(channel['id']),
                'ssilkaPost': self._build_message_link(channel, message.id),
                'tema': themes,
                'tags': []
            }
            
            # Сохраняем в MongoDB
            saved = await save_post(post_data)
            
            if saved:
                logger.info(f"💾 Пост сохранен: {post_data['text'][:30]}...")
            else:
                logger.debug(f"⏭️ Пост уже существует или не сохранен")
            
        except Exception as e:
            logger.error(f"⚠️ Ошибка обработки сообщения: {e}", exc_info=True)
    
    def _build_message_link(self, channel: Dict, message_id: int) -> str:
        """Построение ссылки на сообщение"""
        # TODO: Уточнить формат ссылок в MAX
        # Пока используем общий формат
        if channel.get('username'):
            return f"https://max.ru/{channel['username']}/{message_id}"
        elif channel.get('link'):
            return f"{channel['link']}/{message_id}"
        else:
            return f"https://max.ru/c/{channel['id']}/{message_id}"
    
    async def start(self):
        """Запуск парсера"""
        try:
            await self.initialize()
            self.is_monitoring = True
            logger.info("👂 Мониторинг каналов запущен")
            
            # Поддерживаем соединение
            await self.client.idle()
            
        except KeyboardInterrupt:
            logger.info("Остановка парсера...")
        except Exception as e:
            logger.error(f"Критическая ошибка: {e}", exc_info=True)
        finally:
            if self.client:
                await self.client.close()
            logger.info("Парсер остановлен")


async def main():
    """Точка входа"""
    parser = MaxChannelParser()
    await parser.start()


if __name__ == "__main__":
    asyncio.run(main())
