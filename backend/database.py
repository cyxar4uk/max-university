"""
Модуль для работы с базой данных SQLite и опционально PostgreSQL (пользователи).
При заданном DATABASE_URL пользователи хранятся в PostgreSQL, остальные данные — в SQLite.
"""
import sqlite3
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import secrets
import string

try:
    import psycopg2
    from psycopg2 import extras as pg_extras
except ImportError:
    psycopg2 = None
    pg_extras = None

# PostgreSQL: при наличии DATABASE_URL пользователи хранятся в PG
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
USE_PG = bool(DATABASE_URL and psycopg2)

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
    init_events_db()
    init_applications_db()


def init_users_db():
    """Инициализация базы данных пользователей (SQLite и при наличии DATABASE_URL — PostgreSQL)."""
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
            invitation_code_id INTEGER,  -- ID кода приглашения, если использован
            can_change_role BOOLEAN DEFAULT 1,  -- Может ли менять роль (0 для пользователей с кодом)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Таблица суперадминов приложения
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS superadmins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            max_user_id INTEGER UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

    if USE_PG:
        pg_conn = psycopg2.connect(DATABASE_URL)
        pg_conn.autocommit = True
        cur = pg_conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                max_user_id BIGINT UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT,
                username TEXT,
                photo_url TEXT,
                language_code TEXT,
                role TEXT,
                university_id INTEGER DEFAULT 1,
                invitation_code_id INTEGER,
                can_change_role BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS superadmins (
                id SERIAL PRIMARY KEY,
                max_user_id BIGINT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.close()
        pg_conn.close()


def init_universities_db():
    """Инициализация базы данных университетов"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS universities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            short_name TEXT,
            description TEXT,
            admin_user_id INTEGER,  -- ID администратора университета
            created_by_superadmin_id INTEGER,  -- ID суперадмина, создавшего университет
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Таблица кодов приглашения
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS invitation_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            university_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            generated_by_user_id INTEGER,  -- ID админа, сгенерировавшего код
            used_by_user_id INTEGER,  -- ID пользователя, использовавшего код
            used_at TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (generated_by_user_id) REFERENCES users(id)
        )
    """)
    
    # Таблица регистраций на мероприятия
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS event_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,  -- max_user_id из таблицы users
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(max_user_id)
        )
    """)
    
    # Добавляем дефолтный университет если его нет
    cursor.execute("SELECT COUNT(*) FROM universities WHERE id = 1")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO universities (id, name, short_name, description)
            VALUES (1, 'Российская академия народного хозяйства', 'РАНХиГС', 
                    'Федеральное государственное бюджетное образовательное учреждение высшего образования')
        """)
    
    conn.commit()
    conn.close()


def init_events_db():
    """Инициализация базы данных мероприятий и регистраций"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    
    # Таблица мероприятий
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            location TEXT,
            organizer TEXT,
            university_id INTEGER NOT NULL,
            created_by_user_id INTEGER,  -- ID админа, создавшего мероприятие
            images TEXT,  -- JSON массив URL изображений
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        )
    """)
    
    # Таблица регистраций на мероприятия
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS event_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,  -- max_user_id из таблицы users
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id, user_id),
            FOREIGN KEY (event_id) REFERENCES events(id)
        )
    """)
    
    conn.commit()
    conn.close()


def init_applications_db():
    """Инициализация базы данных заявлений абитуриентов"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    
    # Таблица направлений подготовки
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admission_directions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            university_id INTEGER NOT NULL,
            education_level TEXT NOT NULL,  -- бакалавриат, магистратура, аспирантура
            code TEXT NOT NULL,  -- Код направления (например, 09.03.01)
            name TEXT NOT NULL,
            description TEXT,
            image_url TEXT,  -- URL изображения или null для градиента
            gradient_color TEXT,  -- Цвет градиента если нет изображения
            required_exams TEXT,  -- JSON массив ЕГЭ (например, ["Математика", "Русский язык", "Информатика"])
            cost_per_year INTEGER,  -- Стоимость обучения в год
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES universities(id)
        )
    """)
    
    # Таблица заявлений абитуриентов
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            university_id INTEGER NOT NULL,
            direction_id INTEGER NOT NULL,
            education_level TEXT NOT NULL,
            status TEXT DEFAULT 'pending',  -- pending, approved, rejected
            personal_info TEXT,  -- JSON с личной информацией
            exam_scores TEXT,  -- JSON с баллами ЕГЭ
            application_file_url TEXT,  -- URL прикрепленного файла заявления
            reviewed_by_user_id INTEGER,  -- ID админа, проверившего заявление
            review_notes TEXT,  -- Комментарий при проверке
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (direction_id) REFERENCES admission_directions(id)
        )
    """)
    
    conn.commit()
    conn.close()
    
    # Добавляем мок-данные для направлений если их нет
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM admission_directions WHERE university_id = 1")
    if cursor.fetchone()[0] == 0:
        mock_directions = [
            {
                "university_id": 1,
                "education_level": "бакалавриат",
                "code": "09.03.01",
                "name": "Информатика и вычислительная техника",
                "description": "Подготовка специалистов в области разработки программного обеспечения, системного администрирования и информационных технологий",
                "image_url": None,
                "gradient_color": "#4A90E2",
                "required_exams": json.dumps(["Математика", "Русский язык", "Информатика"]),
                "cost_per_year": 250000
            },
            {
                "university_id": 1,
                "education_level": "бакалавриат",
                "code": "38.03.01",
                "name": "Экономика",
                "description": "Изучение экономических процессов, финансового анализа и управления экономическими системами",
                "image_url": None,
                "gradient_color": "#50C878",
                "required_exams": json.dumps(["Математика", "Русский язык", "Обществознание"]),
                "cost_per_year": 220000
            },
            {
                "university_id": 1,
                "education_level": "бакалавриат",
                "code": "01.03.02",
                "name": "Прикладная математика и информатика",
                "description": "Математическое моделирование, алгоритмы и вычислительные методы",
                "image_url": None,
                "gradient_color": "#FF6B6B",
                "required_exams": json.dumps(["Математика", "Русский язык", "Информатика"]),
                "cost_per_year": 240000
            },
            {
                "university_id": 1,
                "education_level": "магистратура",
                "code": "09.04.01",
                "name": "Информатика и вычислительная техника",
                "description": "Углубленное изучение современных информационных технологий и систем",
                "image_url": None,
                "gradient_color": "#9B59B6",
                "required_exams": json.dumps(["Математика", "Русский язык"]),
                "cost_per_year": 280000
            },
            {
                "university_id": 1,
                "education_level": "аспирантура",
                "code": "09.06.01",
                "name": "Информатика и вычислительная техника",
                "description": "Научно-исследовательская деятельность в области информатики",
                "image_url": None,
                "gradient_color": "#E67E22",
                "required_exams": json.dumps([]),
                "cost_per_year": 300000
            }
        ]
        
        for direction in mock_directions:
            cursor.execute("""
                INSERT INTO admission_directions 
                (university_id, education_level, code, name, description, image_url, gradient_color, required_exams, cost_per_year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                direction["university_id"],
                direction["education_level"],
                direction["code"],
                direction["name"],
                direction["description"],
                direction["image_url"],
                direction["gradient_color"],
                direction["required_exams"],
                direction["cost_per_year"]
            ))
        
        conn.commit()
    conn.close()


def init_config_db():
    """Инициализация базы данных конфигураций"""
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
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    
    # Таблица кастомных блоков (custom_blocks) для модерации
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS custom_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            university_id INTEGER NOT NULL,
            submitted_by_user_id INTEGER NOT NULL,
            block_type TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            code TEXT NOT NULL,  -- JavaScript код виджета
            config_schema TEXT,  -- JSON схема конфигурации
            status TEXT DEFAULT 'pending',  -- pending, approved, rejected
            reviewed_by_user_id INTEGER,
            review_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (submitted_by_user_id) REFERENCES users(id)
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
    
    # Дефолтные разделы и блоки для каждой роли (по умолчанию один раздел)
    default_configs = {
        "student": {
            "sections": [
                {"name": "Главное", "blocks": ["schedule", "lms", "services", "life", "news"]},
            ],
            "header_color": "#0088CC"
        },
        "applicant": {
            "sections": [
                {"name": "Главное", "blocks": ["news", "admission", "payment"]},
            ],
            "header_color": "#0088CC"
        },
        "employee": {
            "sections": [
                {"name": "Главное", "blocks": ["schedule", "services", "news"]},
            ],
            "header_color": "#0088CC"
        },
        "teacher": {
            "sections": [
                {"name": "Главное", "blocks": ["schedule", "services", "news"]},
            ],
            "header_color": "#0088CC"
        },
        "admin": {
            "sections": [
                {"name": "Главное", "blocks": ["analytics", "config", "users"]},
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
    if USE_PG:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=pg_extras.RealDictCursor)
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE max_user_id = %s", (max_user_id,))
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None
    conn = sqlite3.connect(USERS_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE max_user_id = ?", (max_user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(user_data: Dict) -> Dict:
    """Создать нового пользователя"""
    if USE_PG:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO users (max_user_id, first_name, last_name, username, photo_url, language_code, role, university_id, invitation_code_id, can_change_role)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_data["max_user_id"],
            user_data["first_name"],
            user_data.get("last_name"),
            user_data.get("username"),
            user_data.get("photo_url"),
            user_data.get("language_code"),
            user_data.get("role"),
            user_data.get("university_id", 1),
            user_data.get("invitation_code_id"),
            user_data.get("can_change_role", True),
        ))
        conn.commit()
        conn.close()
        return get_user(user_data["max_user_id"])
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (max_user_id, first_name, last_name, username, photo_url, language_code, role, university_id, invitation_code_id, can_change_role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_data["max_user_id"],
        user_data["first_name"],
        user_data.get("last_name"),
        user_data.get("username"),
        user_data.get("photo_url"),
        user_data.get("language_code"),
        user_data.get("role"),
        user_data.get("university_id", 1),
        user_data.get("invitation_code_id"),
        user_data.get("can_change_role", 1)
    ))
    conn.commit()
    conn.close()
    return get_user(user_data["max_user_id"])


def update_user_with_invitation_code(max_user_id: int, invitation_code_id: int, role: str, university_id: int):
    """Обновить пользователя после использования кода приглашения"""
    if USE_PG:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            UPDATE users 
            SET role = %s, university_id = %s, invitation_code_id = %s, can_change_role = false, updated_at = CURRENT_TIMESTAMP
            WHERE max_user_id = %s
        """, (role, university_id, invitation_code_id, max_user_id))
        conn.commit()
        conn.close()
        return
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users 
        SET role = ?, university_id = ?, invitation_code_id = ?, can_change_role = 0, updated_at = CURRENT_TIMESTAMP
        WHERE max_user_id = ?
    """, (role, university_id, invitation_code_id, max_user_id))
    conn.commit()
    conn.close()


def update_user_role(max_user_id: int, role: str, university_id: int = 1):
    """Обновить роль пользователя"""
    if USE_PG:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            UPDATE users 
            SET role = %s, university_id = %s, updated_at = CURRENT_TIMESTAMP
            WHERE max_user_id = %s
        """, (role, university_id, max_user_id))
        conn.commit()
        conn.close()
        return
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users 
        SET role = ?, university_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE max_user_id = ?
    """, (role, university_id, max_user_id))
    conn.commit()
    conn.close()


def update_user_profile(
    max_user_id: int,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    username: Optional[str] = None,
    photo_url: Optional[str] = None,
    language_code: Optional[str] = None,
):
    """Обновить профиль пользователя (имя, фамилия, аватар из MAX)."""
    if USE_PG:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            UPDATE users SET
                first_name = COALESCE(%s, first_name),
                last_name = COALESCE(%s, last_name),
                username = COALESCE(%s, username),
                photo_url = COALESCE(%s, photo_url),
                language_code = COALESCE(%s, language_code),
                updated_at = CURRENT_TIMESTAMP
            WHERE max_user_id = %s
        """, (first_name, last_name, username, photo_url, language_code, max_user_id))
        conn.commit()
        conn.close()
        return
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users SET
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            username = COALESCE(?, username),
            photo_url = COALESCE(?, photo_url),
            language_code = COALESCE(?, language_code),
            updated_at = CURRENT_TIMESTAMP
        WHERE max_user_id = ?
    """, (first_name, last_name, username, photo_url, language_code, max_user_id))
    conn.commit()
    conn.close()


def is_superadmin(max_user_id: int) -> bool:
    """Проверить, является ли пользователь суперадмином."""
    if USE_PG:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM superadmins WHERE max_user_id = %s LIMIT 1", (max_user_id,))
        row = cur.fetchone()
        conn.close()
        return row is not None
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM superadmins WHERE max_user_id = ? LIMIT 1", (max_user_id,))
    row = cursor.fetchone()
    conn.close()
    return row is not None


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
        ORDER BY order_index ASC
    """, (university_id, role))
    
    sections = []
    for section_row in cursor.fetchall():
        section = dict(section_row)
        
        # Получаем блоки раздела
        cursor.execute("""
            SELECT * FROM blocks 
            WHERE section_id = ?
            ORDER BY order_index ASC
        """, (section["id"],))
        
        section["blocks"] = [dict(row) for row in cursor.fetchall()]
        sections.append(section)
    
    # Получаем цвет хедера (из первого раздела или дефолтный)
    header_color = sections[0]["header_color"] if sections else "#0088CC"
    
    conn.close()
    
    return {
        "sections": sections,
        "header_color": header_color,
        "role": role
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
    """Изменить порядок блоков"""
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


def add_block(section_id: int, block_type: str, name: str, order_index: Optional[int] = None):
    """Добавить блок в раздел"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    # Если order_index не указан, добавляем в конец
    if order_index is None:
        cursor.execute("SELECT MAX(order_index) FROM blocks WHERE section_id = ?", (section_id,))
        result = cursor.fetchone()
        order_index = (result[0] + 1) if result[0] is not None else 0
    
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


def add_section(university_id: int, role: str, name: str, header_color: str = "#0088CC") -> int:
    """Добавить новый раздел"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    # Определяем order_index (добавляем в конец)
    cursor.execute("""
        SELECT MAX(order_index) FROM sections 
        WHERE university_id = ? AND role = ?
    """, (university_id, role))
    result = cursor.fetchone()
    order_index = (result[0] + 1) if result[0] is not None else 0
    
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


def get_templates(role: Optional[str] = None) -> List[Dict]:
    """Получить шаблоны"""
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


def save_template(name: str, description: str, role: str, config: Dict) -> int:
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


# ============ ФУНКЦИИ ДЛЯ РАБОТЫ С КАСТОМНЫМИ БЛОКАМИ (МОДЕРАЦИЯ) ============

def submit_custom_block(university_id: int, submitted_by_user_id: int, block_type: str, 
                       name: str, description: str, code: str, config_schema: Dict) -> int:
    """Отправить кастомный блок на модерацию"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO custom_blocks 
        (university_id, submitted_by_user_id, block_type, name, description, code, config_schema, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    """, (
        university_id,
        submitted_by_user_id,
        block_type,
        name,
        description,
        code,
        json.dumps(config_schema)
    ))
    
    block_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return block_id


def get_pending_custom_blocks() -> List[Dict]:
    """Получить список кастомных блоков на модерации"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cb.*, u.first_name, u.last_name, u.username, u.university_id
        FROM custom_blocks cb
        LEFT JOIN users u ON cb.submitted_by_user_id = u.id
        WHERE cb.status = 'pending'
        ORDER BY cb.created_at ASC
    """)
    
    blocks = []
    for row in cursor.fetchall():
        block = dict(row)
        if block.get("config_schema"):
            try:
                block["config_schema"] = json.loads(block["config_schema"])
            except:
                block["config_schema"] = {}
        blocks.append(block)
    
    conn.close()
    return blocks


def review_custom_block(block_id: int, reviewed_by_user_id: int, status: str, review_notes: str = ""):
    """Одобрить или отклонить кастомный блок"""
    if status not in ['approved', 'rejected']:
        raise ValueError("Status must be 'approved' or 'rejected'")
    
    conn = sqlite3.connect(CONFIG_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE custom_blocks 
        SET status = ?, reviewed_by_user_id = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (status, reviewed_by_user_id, review_notes, block_id))
    
    conn.commit()
    conn.close()


def get_approved_custom_blocks(university_id: Optional[int] = None) -> List[Dict]:
    """Получить одобренные кастомные блоки"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if university_id:
        cursor.execute("""
            SELECT * FROM custom_blocks 
            WHERE status = 'approved' AND university_id = ?
            ORDER BY created_at DESC
        """, (university_id,))
    else:
        cursor.execute("""
            SELECT * FROM custom_blocks 
            WHERE status = 'approved'
            ORDER BY created_at DESC
        """)
    
    blocks = []
    for row in cursor.fetchall():
        block = dict(row)
        if block.get("config_schema"):
            try:
                block["config_schema"] = json.loads(block["config_schema"])
            except:
                block["config_schema"] = {}
        blocks.append(block)
    
    conn.close()
    return blocks


def get_custom_block_by_id(block_id: int) -> Optional[Dict]:
    """Получить кастомный блок по ID"""
    conn = sqlite3.connect(CONFIG_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM custom_blocks WHERE id = ?", (block_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        block = dict(row)
        if block.get("config_schema"):
            try:
                block["config_schema"] = json.loads(block["config_schema"])
            except:
                block["config_schema"] = {}
        return block
    return None


# ============ ФУНКЦИИ ДЛЯ РАБОТЫ С МЕРОПРИЯТИЯМИ И РЕГИСТРАЦИЯМИ ============

def register_for_event(event_id: int, user_id: int) -> bool:
    """Зарегистрировать пользователя на мероприятие"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO event_registrations (event_id, user_id)
            VALUES (?, ?)
        """, (event_id, user_id))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        # Уже зарегистрирован
        conn.close()
        return False


def get_user_event_registrations(user_id: int) -> List[int]:
    """Получить список ID мероприятий, на которые зарегистрирован пользователь"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT event_id FROM event_registrations
        WHERE user_id = ?
    """, (user_id,))
    
    event_ids = [row["event_id"] for row in cursor.fetchall()]
    conn.close()
    
    return event_ids


# ============ ФУНКЦИИ ДЛЯ РАБОТЫ С КОДАМИ ПРИГЛАШЕНИЯ ============

def generate_invitation_code() -> str:
    """Генерирует уникальный код приглашения"""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))

def generate_invitation_codes_batch(university_id: int, role: str, generated_by_user_id: int, count: int = 1) -> List[str]:
    """Генерирует пакет кодов приглашения"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    
    codes = []
    for _ in range(count):
        # Генерируем уникальный код
        while True:
            code = generate_invitation_code()
            # Проверяем уникальность
            cursor.execute("SELECT id FROM invitation_codes WHERE code = ?", (code,))
            if cursor.fetchone() is None:
                break
        
        # Вставляем код в БД
        cursor.execute("""
            INSERT INTO invitation_codes (code, university_id, role, generated_by_user_id)
            VALUES (?, ?, ?, ?)
        """, (code, university_id, role, generated_by_user_id))
        
        codes.append(code)
    
    conn.commit()
    conn.close()
    
    return codes

def get_invitation_codes_by_university(university_id: int, used: Optional[bool] = None) -> List[Dict]:
    """Получить коды приглашения для университета"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if used is None:
        cursor.execute("""
            SELECT * FROM invitation_codes
            WHERE university_id = ?
            ORDER BY created_at DESC
        """, (university_id,))
    elif used:
        cursor.execute("""
            SELECT * FROM invitation_codes
            WHERE university_id = ? AND used_by_user_id IS NOT NULL
            ORDER BY used_at DESC
        """, (university_id,))
    else:
        cursor.execute("""
            SELECT * FROM invitation_codes
            WHERE university_id = ? AND used_by_user_id IS NULL
            ORDER BY created_at DESC
        """, (university_id,))
    
    codes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return codes

def use_invitation_code(code: str, user_id: int) -> Optional[Dict]:
    """Использовать код приглашения"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Находим код
    cursor.execute("""
        SELECT * FROM invitation_codes
        WHERE code = ? AND used_by_user_id IS NULL
    """, (code,))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    code_data = dict(row)
    
    # Помечаем код как использованный
    cursor.execute("""
        UPDATE invitation_codes
        SET used_by_user_id = ?, used_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (user_id, code_data["id"]))
    
    conn.commit()
    conn.close()
    
    return code_data

def import_students_and_generate_codes(university_id: int, students: List[Dict], generated_by_user_id: int) -> List[Dict]:
    """Импортировать студентов и сгенерировать для них коды"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    
    results = []
    
    for student in students:
        student_name = student.get("name", "")
        student_id = student.get("id", "")
        role = student.get("role", "student")
        
        # Генерируем уникальный код
        while True:
            code = generate_invitation_code()
            cursor.execute("SELECT id FROM invitation_codes WHERE code = ?", (code,))
            if cursor.fetchone() is None:
                break
        
        # Вставляем код в БД
        cursor.execute("""
            INSERT INTO invitation_codes (code, university_id, role, generated_by_user_id)
            VALUES (?, ?, ?, ?)
        """, (code, university_id, role, generated_by_user_id))
        
        results.append({
            "student_name": student_name,
            "student_id": student_id,
            "role": role,
            "code": code
        })
    
    conn.commit()
    conn.close()
    
    return results


# ============ ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАЯВЛЕНИЯМИ АБИТУРИЕНТОВ ============

def get_education_levels() -> List[str]:
    """Получить список уровней образования"""
    return ["бакалавриат", "магистратура", "аспирантура"]

def get_admission_directions(university_id: int, education_level: str) -> List[Dict]:
    """Получить направления подготовки для уровня образования"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM admission_directions
        WHERE university_id = ? AND education_level = ?
        ORDER BY name ASC
    """, (university_id, education_level))
    
    directions = []
    for row in cursor.fetchall():
        direction = dict(row)
        # Парсим JSON поля
        if direction.get("required_exams"):
            try:
                direction["required_exams"] = json.loads(direction["required_exams"])
            except:
                direction["required_exams"] = []
        directions.append(direction)
    
    conn.close()
    return directions

def get_admission_direction(direction_id: int) -> Optional[Dict]:
    """Получить направление подготовки по ID"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM admission_directions WHERE id = ?", (direction_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        direction = dict(row)
        if direction.get("required_exams"):
            try:
                direction["required_exams"] = json.loads(direction["required_exams"])
            except:
                direction["required_exams"] = []
        return direction
    return None

def create_application(user_id: int, university_id: int, direction_id: int, 
                      education_level: str, personal_info: Dict, exam_scores: Dict,
                      application_file_url: Optional[str] = None) -> int:
    """Создать заявление абитуриента"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO applications 
        (user_id, university_id, direction_id, education_level, personal_info, exam_scores, application_file_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    """, (
        user_id,
        university_id,
        direction_id,
        education_level,
        json.dumps(personal_info),
        json.dumps(exam_scores),
        application_file_url
    ))
    
    application_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return application_id

def get_user_applications(user_id: int) -> List[Dict]:
    """Получить заявления пользователя"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT a.*, d.name as direction_name, d.code as direction_code
        FROM applications a
        LEFT JOIN admission_directions d ON a.direction_id = d.id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
    """, (user_id,))
    
    applications = []
    for row in cursor.fetchall():
        app = dict(row)
        if app.get("personal_info"):
            try:
                app["personal_info"] = json.loads(app["personal_info"])
            except:
                app["personal_info"] = {}
        if app.get("exam_scores"):
            try:
                app["exam_scores"] = json.loads(app["exam_scores"])
            except:
                app["exam_scores"] = {}
        applications.append(app)
    
    conn.close()
    return applications

def get_pending_applications(university_id: int) -> List[Dict]:
    """Получить заявления на проверку для админов"""
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT a.*, d.name as direction_name, d.code as direction_code,
               u.first_name, u.last_name, u.username
        FROM applications a
        LEFT JOIN admission_directions d ON a.direction_id = d.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.university_id = ? AND a.status = 'pending'
        ORDER BY a.created_at ASC
    """, (university_id,))
    
    applications = []
    for row in cursor.fetchall():
        app = dict(row)
        if app.get("personal_info"):
            try:
                app["personal_info"] = json.loads(app["personal_info"])
            except:
                app["personal_info"] = {}
        if app.get("exam_scores"):
            try:
                app["exam_scores"] = json.loads(app["exam_scores"])
            except:
                app["exam_scores"] = {}
        applications.append(app)
    
    conn.close()
    return applications

def review_application(application_id: int, reviewed_by_user_id: int, 
                      status: str, review_notes: Optional[str] = None):
    """Проверить заявление (принять/отклонить)"""
    if status not in ['approved', 'rejected']:
        raise ValueError("Status must be 'approved' or 'rejected'")
    
    conn = sqlite3.connect(UNIVERSITIES_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE applications
        SET status = ?, reviewed_by_user_id = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (status, reviewed_by_user_id, review_notes, application_id))
    
    conn.commit()
    conn.close()
