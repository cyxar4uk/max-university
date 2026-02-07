"""
FastAPI приложение для веб-API мини-приложения MAX.
Все эндпоинты для фронтенда (не бот).
"""
from pathlib import Path
import os
from dotenv import load_dotenv
_backend_dir = Path(__file__).resolve().parent
for name in (".env.events", ".env.database", ".env", ".env.bot"):
    p = _backend_dir / name
    if p.is_file():
        load_dotenv(p)
    load_dotenv(Path.cwd() / name)

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import hmac
import hashlib
import database

app = FastAPI(title="Digital University MAX Mini-App API", version="2.0.0")

@app.on_event("startup")
async def startup_event():
    """Инициализация баз данных при старте приложения"""
    import logging
    log = logging.getLogger("uvicorn.error")
    database.init_databases()
    if getattr(database, "USE_PG", False):
        log.info("Database: PostgreSQL (users)")
    elif os.environ.get("DATABASE_URL"):
        log.warning("Database: SQLite — установите psycopg2-binary в venv: pip install psycopg2-binary")
    else:
        log.info("Database: SQLite only (DATABASE_URL not set)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "your-secret-key-change-in-production"

class User(BaseModel):
    max_user_id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    language_code: Optional[str] = None
    role: Optional[str] = None
    university_id: Optional[int] = 1

def get_user_id_from_headers(x_max_user_id: Optional[str] = Header(None)) -> int:
    """Извлекает ID пользователя из заголовков."""
    if not x_max_user_id:
        return 10001
    try:
        return int(x_max_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

@app.get("/")
async def root():
    return {"message": "Digital University MAX Mini-App API", "status": "running"}

@app.get("/api/health")
async def health_check():
    """Проверка работы сервиса"""
    return {"status": "healthy"}

@app.post("/api/users/auth")
async def authenticate_user(user: User, x_max_init_data: Optional[str] = Header(None), role_from_start_param: Optional[str] = None):
    """
    Аутентификация пользователя через MAX Bridge
    """
    if x_max_init_data:
        try:
            data = json.loads(x_max_init_data)
            received_hash = data.get('hash')
            data_check_string = "\n".join(
                f"{k}={v}" for k, v in sorted(data.items()) 
                if k != 'hash' and isinstance(v, (str, int, float, bool))
            )
            secret_key = hashlib.sha256(SECRET_KEY.encode()).digest()
            calculated_hash = hmac.new(
                secret_key,
                data_check_string.encode(),
                hashlib.sha256
            ).hexdigest()
            if received_hash != calculated_hash:
                raise HTTPException(status_code=401, detail="Invalid initData hash")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid initData: {str(e)}")
    
    existing = database.get_user(user.max_user_id)
    if existing:
        database.update_user_profile(
            user.max_user_id,
            first_name=user.first_name,
            last_name=user.last_name,
            username=user.username,
            photo_url=user.photo_url,
            language_code=user.language_code
        )
        if role_from_start_param:
            database.update_user_role(user.max_user_id, role_from_start_param, user.university_id or 1)
        updated = database.get_user(user.max_user_id)
        return {"status": "authenticated", "user": updated}
    
    user_data = {
        "max_user_id": user.max_user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "photo_url": user.photo_url,
        "language_code": user.language_code,
        "role": role_from_start_param or user.role,
        "university_id": user.university_id or 1,
    }
    new_user = database.create_user(user_data)
    return {"status": "authenticated", "user": new_user}

# Импортируем остальные эндпоинты из main.py (будут добавлены ниже)
# Пока оставляю базовую структуру
