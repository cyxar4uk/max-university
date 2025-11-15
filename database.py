"""
Модуль для работы с базой данных SQLite
Создает файлы .db для хранения структуры и данных
"""
import sqlite3
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

# Путь к директории с базами данных
DB_DIR = "data"
USERS_DB_PATH = os.path.join(DB_DIR, "users.db")
UNIVERSITIES_DB_PATH = os.path.join(DB_DIR, "universities.db")
CONFIG_DB_PATH = os.path.join(DB_DIR, "config.db")

# Создаем директорию если её нет
os.makedirs(DB_DIR, exist_ok=True)


def init_databases():
    """Инициализация всех баз данных"""
    init_users_db()
    init_universities_db()
    init_config_db()


def init_users_db():
    """Инициализация базы данных пользователей"""
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            max_user_id INTEGER UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT,
            username TEXT,
            photo_url TEXT,
            language_code TEXT,
            role TEXT,
            university_id INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()


def init_universities_db():
    """Инициализация базы данных университетов"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS universities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            short_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Добавляем дефолтный университет если его нет
    cursor.execute("SELECT COUNT(*) FROM universities")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO universities (id, name, short_name)
            VALUES (1, 'Российская академия народного хозяйства', 'РАНХиГС')
        """)
    
    conn.commit()
    conn.close()


def init_config_db():
    """Инициализация базы данных конфигураций (разделы, блоки, настройки)"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    # Таблица разделов (sections)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            university_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            order_index INTEGER DEFAULT 0,
            header_color TEXT DEFAULT '#0088CC',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(university_id, role, name)
        )
    """)
    
    # Таблица блоков (blocks)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL,
            block_type TEXT NOT NULL,
            name TEXT NOT NULL,
            order_index INTEGER DEFAULT 0,
            config TEXT,  -- JSON конфигурация блока
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
        )
    """)
    
    # Таблица шаблонов (templates)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            role TEXT NOT NULL,
            config TEXT NOT NULL,  -- JSON конфигурация шаблона
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Инициализация дефолтных разделов и блоков
    init_default_config(cursor)
    
    conn.commit()
    conn.close()


def init_default_config(cursor):
    """Инициализация дефолтной конфигурации"""
    # Проверяем, есть ли уже конфигурация
    cursor.execute("SELECT COUNT(*) FROM sections WHERE university_id = 1")
    if cursor.fetchone()[0] > 0:
        return
    
    # Дефолтные разделы и блоки для каждой роли
    default_configs = {
        "student": {
            "sections": [
                {"name": "Главное", "blocks": ["profile", "schedule", "lms", "services", "life"]},
            ],
            "header_color": "#0088CC"
        },
        "applicant": {
            "sections": [
                {"name": "Главное", "blocks": ["profile", "news", "admission", "payment"]},
            ],
            "header_color": "#0088CC"
        },
        "employee": {
            "sections": [
                {"name": "Главное", "blocks": ["profile", "schedule", "services", "news"]},
            ],
            "header_color": "#0088CC"
        },
        "admin": {
            "sections": [
                {"name": "Главное", "blocks": ["profile", "analytics", "config", "users"]},
            ],
            "header_color": "#0088CC"
        }
    }
    
    for role, config in default_configs.items():
        for section_idx, section in enumerate(config["sections"]):
            # Создаем раздел
            cursor.execute("""
                INSERT INTO sections (university_id, role, name, order_index, header_color)
                VALUES (1, ?, ?, ?, ?)
            """, (role, section["name"], section_idx, config["header_color"]))
            section_id = cursor.lastrowid
            
            # Создаем блоки в разделе
            for block_idx, block_type in enumerate(section["blocks"]):
                block_names = {
                    "profile": "Профиль",
                    "schedule": "Расписание",
                    "lms": "Учебные материалы",
                    "services": "Услуги",
                    "life": "Внеучебная жизнь",
                    "news": "Новости",
                    "admission": "Поступление",
                    "payment": "Оплата",
                    "analytics": "Аналитика",
                    "config": "Настройки",
                    "users": "Пользователи"
                }
                cursor.execute("""
                    INSERT INTO blocks (section_id, block_type, name, order_index)
                    VALUES (?, ?, ?, ?)
                """, (section_id, block_type, block_names.get(block_type, block_type), block_idx))


# ============ ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ============

def get_user(max_user_id: int) -> Optional[Dict]:
    """Получить пользователя по MAX user ID"""
    conn = sqlite3.connect(USERS_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE max_user_id = ?", (max_user_id,))
    row = cursor.fetchone()
    conn.close()
    
    return dict(row) if row else None


def create_user(user_data: Dict) -> Dict:
    """Создать нового пользователя"""
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO users (max_user_id, first_name, last_name, username, photo_url, language_code, role, university_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_data["max_user_id"],
        user_data["first_name"],
        user_data.get("last_name"),
        user_data.get("username"),
        user_data.get("photo_url"),
        user_data.get("language_code"),
        user_data.get("role"),
        user_data.get("university_id", 1)
    ))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return get_user(user_data["max_user_id"])


def update_user_role(max_user_id: int, role: str, university_id: int = 1):
    """Обновить роль пользователя"""
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE users 
        SET role = ?, university_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE max_user_id = ?
    """, (role, university_id, max_user_id))
    
    conn.commit()
    conn.close()


# ============ ФУНКЦИИ ДЛЯ РАБОТЫ С КОНФИГУРАЦИЕЙ ============

def get_university_config(university_id: int, role: str) -> Dict:
    """Получить конфигурацию университета для роли"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Получаем разделы
    cursor.execute("""
        SELECT * FROM sections 
        WHERE university_id = ? AND role = ?
        ORDER BY order_index
    """, (university_id, role))
    sections = [dict(row) for row in cursor.fetchall()]
    
    # Получаем блоки для каждого раздела
    for section in sections:
        cursor.execute("""
            SELECT * FROM blocks 
            WHERE section_id = ?
            ORDER BY order_index
        """, (section["id"],))
        section["blocks"] = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "sections": sections,
        "header_color": sections[0]["header_color"] if sections else "#0088CC"
    }


def update_section_name(section_id: int, name: str):
    """Обновить название раздела"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE sections 
        SET name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (name, section_id))
    
    conn.commit()
    conn.close()


def update_header_color(university_id: int, role: str, color: str):
    """Обновить цвет хедера для роли"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE sections 
        SET header_color = ?, updated_at = CURRENT_TIMESTAMP
        WHERE university_id = ? AND role = ?
    """, (color, university_id, role))
    
    conn.commit()
    conn.close()


def reorder_blocks(block_ids: List[int]):
    """Изменить порядок блоков (для drag & drop)"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    for index, block_id in enumerate(block_ids):
        cursor.execute("""
            UPDATE blocks 
            SET order_index = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (index, block_id))
    
    conn.commit()
    conn.close()


def add_block(section_id: int, block_type: str, name: str, order_index: int = None):
    """Добавить блок в раздел"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    # Если order_index не указан, добавляем в конец
    if order_index is None:
        cursor.execute("SELECT MAX(order_index) FROM blocks WHERE section_id = ?", (section_id,))
        max_order = cursor.fetchone()[0]
        order_index = (max_order + 1) if max_order is not None else 0
    
    cursor.execute("""
        INSERT INTO blocks (section_id, block_type, name, order_index)
        VALUES (?, ?, ?, ?)
    """, (section_id, block_type, name, order_index))
    
    block_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return block_id


def delete_block(block_id: int):
    """Удалить блок"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM blocks WHERE id = ?", (block_id,))
    
    conn.commit()
    conn.close()


def add_section(university_id: int, role: str, name: str, header_color: str = "#0088CC"):
    """Добавить новый раздел"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT MAX(order_index) FROM sections WHERE university_id = ? AND role = ?", (university_id, role))
    max_order = cursor.fetchone()[0]
    order_index = (max_order + 1) if max_order is not None else 0
    
    cursor.execute("""
        INSERT INTO sections (university_id, role, name, order_index, header_color)
        VALUES (?, ?, ?, ?, ?)
    """, (university_id, role, name, order_index, header_color))
    
    section_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return section_id


def delete_section(section_id: int):
    """Удалить раздел (блоки удалятся каскадно)"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM sections WHERE id = ?", (section_id,))
    
    conn.commit()
    conn.close()


def get_templates(role: str = None) -> List[Dict]:
    """Получить шаблоны (опционально фильтр по роли)"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if role:
        cursor.execute("SELECT * FROM templates WHERE role = ? ORDER BY created_at DESC", (role,))
    else:
        cursor.execute("SELECT * FROM templates ORDER BY created_at DESC")
    
    templates = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return templates


def save_template(name: str, description: str, role: str, config: Dict):
    """Сохранить шаблон"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO templates (name, description, role, config)
        VALUES (?, ?, ?, ?)
    """, (name, description, role, json.dumps(config)))
    
    template_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return template_id


# Инициализация при импорте
init_databases()

