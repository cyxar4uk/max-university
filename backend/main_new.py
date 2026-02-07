"""
Точка входа: запускает и FastAPI веб-приложение, и PyMax бота.
"""
import asyncio
import logging
import uvicorn
from app import app
from bot.client import start_bot

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_both():
    """Запустить и веб-приложение, и бота параллельно."""
    # Запускаем бота в фоне
    bot_task = asyncio.create_task(start_bot())
    logger.info("Bot task started")
    
    # Запускаем FastAPI через uvicorn
    config = uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    try:
        asyncio.run(run_both())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
