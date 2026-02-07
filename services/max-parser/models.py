"""
Модели для работы с MongoDB.
Использует ту же коллекцию news_posts, что и Telegram-парсер.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import Dict, List, Optional
import os
import logging

logger = logging.getLogger(__name__)

# Подключение к MongoDB (та же БД, что и Telegram-парсер)
MONGO_URI = os.getenv("MONGOdb")

if not MONGO_URI:
    logger.warning("MONGOdb not set in environment variables")

client = AsyncIOMotorClient(MONGO_URI) if MONGO_URI else None
db = client.get_database() if client else None
posts_collection = db.news_posts if db else None

# Кэш для отслеживания обработанных постов
processed_posts = {}


async def save_post(post_data: Dict) -> bool:
    """
    Сохранение поста в MongoDB.
    
    Args:
        post_data: Словарь с данными поста:
            - text: текст поста
            - date: дата (datetime или None)
            - channel: название канала
            - channelUsername: username канала
            - channelId: ID канала
            - ssilkaPost: ссылка на пост
            - tema: список тем
            - tags: список тегов (опционально)
    
    Returns:
        True если пост сохранен, False если уже существует
    """
    if not posts_collection:
        logger.error("MongoDB не подключена")
        return False
    
    try:
        # Проверка на дубликаты
        post_key = f"{post_data['channelId']}_{post_data['ssilkaPost']}"
        
        if post_key in processed_posts:
            logger.debug(f"Пост уже обработан: {post_key}")
            return False
        
        # Проверка в БД
        existing = await posts_collection.find_one({
            "channelId": post_data["channelId"],
            "ssilkaPost": post_data["ssilkaPost"]
        })
        
        if existing:
            logger.debug(f"Пост уже существует в БД: {post_data['ssilkaPost']}")
            processed_posts[post_key] = True
            return False
        
        # Устанавливаем дату, если не указана
        if "date" not in post_data or not post_data["date"]:
            post_data["date"] = datetime.now()
        elif isinstance(post_data["date"], (int, float)):
            # Если timestamp
            post_data["date"] = datetime.fromtimestamp(post_data["date"])
        
        # Сохраняем пост
        await posts_collection.insert_one(post_data)
        processed_posts[post_key] = True
        
        # Очистка кэша при превышении лимита
        if len(processed_posts) > 1000:
            oldest_key = next(iter(processed_posts))
            del processed_posts[oldest_key]
        
        logger.info(f"✅ Пост сохранен в БД: {post_data['text'][:30]}...")
        return True
        
    except Exception as e:
        logger.error(f"⚠️ Ошибка сохранения поста: {e}")
        return False


async def get_all_themes() -> List[str]:
    """
    Получение всех тем из БД пользователей.
    Аналогично UserTheme.distinct('themes') в receiving_post.js
    
    TODO: Реализовать получение тем из коллекции UserTheme
    Пока возвращаем базовый список тем
    """
    if not db:
        logger.warning("MongoDB не подключена, возвращаем базовые темы")
        return [
            "искусственный интеллект",
            "криптовалюты",
            "медицина",
            "политика",
            "экономика",
            "технологии",
            "наука",
            "образование",
            "другое"
        ]
    
    try:
        # TODO: Реализовать получение тем из коллекции UserTheme
        # Пока используем базовый список
        themes_collection = db.get_collection("user_themes")
        themes = await themes_collection.distinct("themes")
        
        if themes:
            return themes
        
        # Если тем нет, возвращаем базовый список
        return [
            "искусственный интеллект",
            "криптовалюты",
            "медицина",
            "политика",
            "экономика",
            "технологии",
            "наука",
            "образование",
            "другое"
        ]
        
    except Exception as e:
        logger.error(f"⚠️ Ошибка получения тем: {e}")
        return ["другое"]


async def clean_old_posts(max_age_days: int = 10, max_posts: int = 1000):
    """
    Очистка старых постов из БД.
    Аналогично cleanOldPosts() в receiving_post.js
    """
    if not posts_collection:
        logger.warning("MongoDB не подключена, пропускаем очистку")
        return
    
    try:
        # Удаление постов старше max_age_days дней
        from datetime import timedelta
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        
        age_result = await posts_collection.delete_many({
            "date": {"$lt": cutoff_date}
        })
        logger.info(f"Удалено {age_result.deleted_count} постов старше {max_age_days} дней")
        
        # Удаление лишних постов, если их больше max_posts
        count = await posts_collection.count_documents({})
        if count > max_posts:
            to_delete = count - max_posts
            oldest_posts = await posts_collection.find(
                {},
                {"_id": 1}
            ).sort("date", 1).limit(to_delete).to_list(length=to_delete)
            
            if oldest_posts:
                ids_to_delete = [post["_id"] for post in oldest_posts]
                count_result = await posts_collection.delete_many({
                    "_id": {"$in": ids_to_delete}
                })
                logger.info(f"Удалено {count_result.deleted_count} самых старых постов (лимит {max_posts})")
                
    except Exception as e:
        logger.error(f"⚠️ Ошибка очистки старых постов: {e}")
