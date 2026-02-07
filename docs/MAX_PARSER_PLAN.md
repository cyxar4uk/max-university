# План реализации парсера каналов MAX

## Анализ текущей архитектуры

### Telegram-парсер (cold-news)
- **Технология:** Node.js + TelegramClient (MTProto)
- **Мониторинг:** EventHandler для UpdateNewChannelMessage
- **Классификация:** GigaChat API
- **Хранилище:** MongoDB (коллекция news_posts)
- **Уведомления:** Telegram Bot API

### MAX-парсер (новый)
- **Технология:** Python + PyMax (WebSocket)
- **Мониторинг:** @client.on_message() с фильтрами
- **Классификация:** GigaChat API (та же логика)
- **Хранилище:** MongoDB (та же коллекция news_posts)
- **Уведомления:** MAX Bot API (опционально)

---

## Архитектурное решение

### ✅ Выбранный подход: Прямой мониторинг каналов

**Почему не пересылка в один чат:**
- ❌ Усложняет архитектуру (нужна настройка пересылки)
- ❌ Риск потери метаданных о канале
- ❌ Дополнительная нагрузка на систему
- ❌ Зависимость от пересылки (точка отказа)

**Почему прямой мониторинг:**
- ✅ PyMax поддерживает фильтры по типу чата
- ✅ Проще и надежнее
- ✅ Сохранение всех метаданных
- ✅ Меньше нагрузки
- ✅ Соответствует текущей архитектуре

---

## Структура проекта

```
services/
├── cold-news/              # Telegram-парсер (существующий)
│   ├── components/
│   │   └── receiving_post.js
│   └── ...
│
└── max-parser/            # MAX-парсер (новый)
    ├── parser.py          # Основной парсер
    ├── config.py          # Конфигурация
    ├── models.py          # MongoDB модели
    ├── classifier.py      # GigaChat классификация
    ├── channels_config.py # Список каналов MAX
    ├── requirements.txt   # Зависимости Python
    └── .env.example       # Пример переменных окружения
```

---

## Реализация

### 1. Базовая структура парсера

**Файл: `services/max-parser/parser.py`**

```python
import asyncio
import os
from pymax import MaxClient, SocketMaxClient
from pymax.filters import Filters
from pymax.types import Message, Chat
from pymax.static.enum import ChatType
from dotenv import load_dotenv
from models import PostModel, save_post
from classifier import classify_post
from channels_config import DEFAULT_CHANNELS, update_channels_list

load_dotenv()

class MaxChannelParser:
    def __init__(self):
        self.client = None
        self.channels_cache = {}
        self.is_monitoring = False
        
    async def initialize(self):
        """Инициализация клиента MAX"""
        phone = os.getenv("MAX_PHONE")
        work_dir = os.getenv("MAX_WORK_DIR", "./cache")
        
        # Используем SocketMaxClient для входа по номеру телефона
        self.client = SocketMaxClient(
            phone=phone,
            work_dir=work_dir,
            headers=UserAgentPayload(device_type="DESKTOP")
        )
        
        await self.client.start()
        print(f"✅ MAX клиент запущен. ID: {self.client.me.id}")
        
    async def load_channels(self):
        """Загрузка списка каналов для мониторинга"""
        # Получаем все чаты
        chats = await self.client.fetch_chats()
        
        # Фильтруем только каналы
        channels = [chat for chat in chats if chat.chat_type == ChatType.CHANNEL]
        
        # Обновляем кэш
        self.channels_cache.clear()
        for channel in channels:
            self.channels_cache[channel.id_] = {
                'id': channel.id_,
                'title': channel.title,
                'username': getattr(channel, 'username', None),
                'link': channel.link
            }
            print(f"🔎 Канал добавлен: {channel.title} (ID: {channel.id_})")
        
        print(f"📊 Всего каналов для мониторинга: {len(self.channels_cache)}")
        
    @client.on_start
    async def on_start(self):
        """Обработчик старта клиента"""
        print("🚀 Парсер MAX запущен")
        await self.load_channels()
        
    @client.on_message(Filters.chat_type(ChatType.CHANNEL))
    async def handle_channel_message(self, message: Message):
        """Обработка сообщений из каналов"""
        if not message.text:
            return
            
        # Проверяем, что это канал из нашего списка
        if message.chat_id not in self.channels_cache:
            return
            
        channel = self.channels_cache[message.chat_id]
        print(f"📩 Пост из канала '{channel['title']}': {message.text[:50]}...")
        
        # Классификация и сохранение
        await self.process_message(message, channel)
        
    async def process_message(self, message: Message, channel: dict):
        """Обработка и сохранение сообщения"""
        try:
            # Получаем список всех тем из БД
            all_themes = await get_all_themes()  # TODO: реализовать
            
            # Классификация через GigaChat
            themes = await classify_post(message.text, all_themes)
            
            # Если только "другое" - не сохраняем
            if len(themes) == 1 and themes[0] == "другое":
                print(f"⏭️ Пост пропущен (тема 'другое')")
                return
            
            # Формируем данные поста
            post_data = {
                'text': message.text,
                'date': datetime.fromtimestamp(message.time),
                'channel': channel['title'],
                'channelUsername': channel.get('username', ''),
                'channelId': str(channel['id']),
                'ssilkaPost': self._build_message_link(channel, message.id),
                'tema': themes,
                'tags': []
            }
            
            # Сохраняем в MongoDB
            await save_post(post_data)
            
            print(f"💾 Пост сохранен: {post_data['text'][:30]}...")
            
        except Exception as e:
            print(f"⚠️ Ошибка обработки сообщения: {e}")
    
    def _build_message_link(self, channel: dict, message_id: int) -> str:
        """Построение ссылки на сообщение"""
        if channel.get('username'):
            return f"https://max.ru/{channel['username']}/{message_id}"
        elif channel.get('link'):
            return f"{channel['link']}/{message_id}"
        else:
            return f"https://max.ru/c/{channel['id']}/{message_id}"
    
    async def start(self):
        """Запуск парсера"""
        await self.initialize()
        await self.client.idle()

async def main():
    parser = MaxChannelParser()
    await parser.start()

if __name__ == "__main__":
    asyncio.run(main())
```

### 2. Конфигурация каналов

**Файл: `services/max-parser/channels_config.py`**

```python
"""
Список каналов MAX по умолчанию для парсера.
Аналогично channels.config.js для Telegram.
"""

DEFAULT_CHANNELS = [
    # TODO: добавить каналы MAX
    # Формат: ID канала или username (если поддерживается)
]

async def update_channels_list():
    """Обновление списка каналов из БД пользователей"""
    # TODO: получить каналы, добавленные пользователями
    # Аналогично updateChannelsList() в receiving_post.js
    return DEFAULT_CHANNELS
```

### 3. Модели MongoDB

**Файл: `services/max-parser/models.py`**

```python
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os

# Подключение к MongoDB (та же БД, что и Telegram-парсер)
MONGO_URI = os.getenv("MONGOdb")
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database()
posts_collection = db.news_posts

async def save_post(post_data: dict):
    """Сохранение поста в MongoDB"""
    post_data['date'] = datetime.now() if 'date' not in post_data else post_data['date']
    
    # Проверка на дубликаты
    existing = await posts_collection.find_one({
        'channelId': post_data['channelId'],
        'ssilkaPost': post_data['ssilkaPost']
    })
    
    if existing:
        print(f"⏭️ Пост уже существует: {post_data['ssilkaPost']}")
        return
    
    await posts_collection.insert_one(post_data)
    print(f"✅ Пост сохранен в БД")

async def get_all_themes():
    """Получение всех тем из БД пользователей"""
    # TODO: реализовать получение тем из коллекции UserTheme
    # Аналогично UserTheme.distinct('themes') в receiving_post.js
    return []
```

### 4. Классификация через GigaChat

**Файл: `services/max-parser/classifier.py`**

```python
import aiohttp
import os
from typing import List

# Используем ту же логику, что и в Telegram-парсере
GIGACHAT_AUTH_URL = os.getenv("GIGACHAT_AUTH_URL")
GIGACHAT_API_URL = os.getenv("GIGACHAT_API_URL")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

async def classify_post(post_text: str, all_themes: List[str]) -> List[str]:
    """Классификация поста через GigaChat"""
    # TODO: реализовать ту же логику, что и в receiving_post.js
    # Функция classifyPost()
    pass
```

---

## Переменные окружения

**Файл: `services/max-parser/.env.example`**

```env
# MAX авторизация
MAX_PHONE=+79001234567
MAX_WORK_DIR=./cache

# MongoDB (та же БД, что и Telegram-парсер)
MONGOdb=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/dbname

# GigaChat (те же ключи, что и для Telegram-парсера)
GIGACHAT_AUTH_URL=https://...
GIGACHAT_API_URL=https://...
CLIENT_ID=...
CLIENT_SECRET=...
```

---

## Преимущества реализации

1. **Единая БД** - используем ту же MongoDB коллекцию `news_posts`
2. **Единая классификация** - та же логика GigaChat
3. **Простота** - прямой мониторинг без пересылки
4. **Надежность** - меньше точек отказа
5. **Масштабируемость** - легко добавить новые каналы

---

## Следующие шаги

1. ✅ Создать структуру проекта
2. ✅ Реализовать базовый парсер
3. ✅ Интегрировать с MongoDB
4. ✅ Добавить классификацию GigaChat
5. ✅ Настроить мониторинг каналов
6. ✅ Добавить обработку ошибок
7. ✅ Создать systemd сервис для запуска

---

## Вопросы для уточнения

1. Какие каналы MAX нужно мониторить? (аналог DEFAULT_CHANNELS)
2. Нужны ли уведомления пользователям через MAX Bot API?
3. Как получать список каналов, добавленных пользователями? (есть ли аналогичная модель UserTheme для MAX?)
