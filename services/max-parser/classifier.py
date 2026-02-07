"""
Классификация постов через GigaChat API.
Использует ту же логику, что и Telegram-парсер.
"""

import aiohttp
import os
import asyncio
import time
from typing import List
from base64 import b64encode

# Переменные окружения для GigaChat
GIGACHAT_AUTH_URL = os.getenv("GIGACHAT_AUTH_URL")
GIGACHAT_API_URL = os.getenv("GIGACHAT_API_URL")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

# Кэш токена
_giga_chat_token = None
_token_expiration = 0


async def get_giga_chat_token() -> str:
    """Получение токена GigaChat с кэшированием"""
    global _giga_chat_token, _token_expiration
    
    import time
    
    # Проверяем, не истек ли токен
    current_time_ms = time.time() * 1000
    if _giga_chat_token and current_time_ms < _token_expiration:
        return _giga_chat_token
    
    try:
        # Формируем Basic Auth заголовок
        auth_string = b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                GIGACHAT_AUTH_URL,
                data={"scope": "GIGACHAT_API_B2B"},
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                    "Authorization": f"Basic {auth_string}"
                },
                ssl=False
            ) as response:
                data = await response.json()
                _giga_chat_token = data["access_token"]
                # Сохраняем время истечения (минус 1 минута для запаса)
                _token_expiration = time.time() * 1000 + (data["expires_in"] * 1000) - 60000
                return _giga_chat_token
                
    except Exception as e:
        print(f"⚠️ Ошибка получения токена GigaChat: {e}")
        raise


async def classify_post(post_text: str, all_themes: List[str], retries: int = 3) -> List[str]:
    """
    Классификация поста через GigaChat.
    
    Args:
        post_text: Текст поста для классификации
        all_themes: Список всех возможных тем
        retries: Количество попыток при ошибке
    
    Returns:
        Список тем, к которым относится пост
    """
    try:
        # Задержка перед запросом (rate limiting)
        await asyncio.sleep(1)
        
        token = await get_giga_chat_token()
        
        prompt = f"""Проанализируй новостной пост и определи, к каким темам из списка он относится. 
      Учитывай не только прямое упоминание темы, но и смежные области. Вот примеры соответствий:
      
      * Искусственный интеллект:
        - "ChatGPT", "Gemini", "Copilot" → "искусственный интеллект"
        - "нейросети", "машинное обучение", "LLM" → "искусственный интеллект"
        - "генеративный ИИ", "трансформеры", "дипфейки" → "искусственный интеллект"
      
      * Криптовалюты:
        - "биткоин", "эфириум", "солана" → "криптовалюты"
        - "блокчейн", "DeFi", "NFT" → "криптовалюты"
        - "майнинг", "стейкинг", "криптобиржи" → "криптовалюты"
      
      * Медицина:
        - "COVID", "вакцина", "эпидемия" → "медицина"
        - "ДНК", "гены", "биотехнологии" → "медицина"
        - "операция", "лекарство", "FDA" → "медицина"
      
      * Политика:
        - "выборы", "президент", "парламент" → "политика"
        - "санкции", "дипломатия", "ООН" → "политика"
        - "законопроект", "лоббирование", "импичмент" → "политика"
      
      * Экономика:
        - "инфляция", "ВВП", "безработица" → "экономика"
        - "акции", "рынок", "инвестиции" → "экономика"
        - "кризис", "рецессия", "биржа" → "экономика"
      
      Список всех возможных тем: {", ".join(all_themes)}.
      
      Ответ должен содержать ТОЛЬКО подходящие темы в формате: "тема1, тема2, тема3".
      Если пост не подходит ни к одной теме, напиши "другое".
      
      Текст поста:
      "{post_text[:500]}" """
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                GIGACHAT_API_URL,
                json={
                    "model": "GigaChat-Pro",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 50
                },
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": f"Bearer {token}"
                },
                ssl=False,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                data = await response.json()
                response_text = data["choices"][0]["message"]["content"].strip()
                
                # Парсим ответ
                matched_themes = [
                    theme.strip().lower()
                    for theme in response_text.split(",")
                ]
                matched_themes = [
                    theme for theme in matched_themes
                    if theme in all_themes
                ]
                
                return matched_themes if matched_themes else ["другое"]
                
    except Exception as e:
        if retries > 0:
            await asyncio.sleep(3)
            return await classify_post(post_text, all_themes, retries - 1)
        
        print(f"⚠️ Ошибка классификации: {e}")
        return ["другое"]
