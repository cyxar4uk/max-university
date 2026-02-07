#!/usr/bin/env python3
"""
Скрипт запуска парсера MAX.
Использование: python run.py
"""

import asyncio
import sys
from parser import MaxChannelParser

async def main():
    """Точка входа"""
    parser = MaxChannelParser()
    try:
        await parser.start()
    except KeyboardInterrupt:
        print("\n⏹️  Остановка парсера...")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
