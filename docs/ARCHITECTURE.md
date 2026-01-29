# Архитектура и техническое решение

## Обзор архитектуры

Цифровой университет MAX построен по принципу микросервисной архитектуры с четким разделением ответственности между компонентами.

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                      MAX Messenger                           │
│              (MAX Bridge API + MAX Bot API)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼────┐                 ┌───▼────┐
    │  Bot    │                 │  Mini  │
    │ Webhook │                 │  App   │
    └────┬────┘                 └───┬────┘
         │                          │
    ┌────▼──────────────────────────▼────┐
    │         FastAPI Backend            │
    │    (Python 3.9+, Async/Await)      │
    │                                     │
    │  ┌──────────┐  ┌───────────────┐  │
    │  │   Auth   │  │  Admin API    │  │
    │  ├──────────┤  ├───────────────┤  │
    │  │ Content  │  │  SuperAdmin   │  │
    │  ├──────────┤  ├───────────────┤  │
    │  │  Codes   │  │Custom Blocks  │  │
    │  └──────────┘  └───────────────┘  │
    └─────────────────┬───────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    ┌────▼────┐  ┌────▼────┐  ┌──▼───┐
    │users.db │  │univ.db  │  │cfg.db│
    └─────────┘  └─────────┘  └──────┘
```

### Frontend Architecture

```
┌───────────────────────────────────────────────────────┐
│              React Application (Vite)                  │
│                                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │         Redux Store (State Management)       │   │
│  │  - User State (role, university, auth)       │   │
│  │  - UI State (current section, mock mode)     │   │
│  └──────────────────────────────────────────────┘   │
│                                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │              Routing (HashRouter)            │   │
│  │  / → WelcomePage (invitation code)           │   │
│  │  MainLayout: bottom nav Главная | Хаб | Учёба │   │
│  │  /home → HomePage (widgets dashboard)        │   │
│  │  /hub → HubPage (feed, stories, events)      │   │
│  │  /schedule, /courses, … → Учёба              │   │
│  │  /admin, /superadmin → Admin                 │   │
│  └──────────────────────────────────────────────┘   │
│                                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │          Widget System (Modular)             │   │
│  │  BlockWidget, HubEventsWidget, feed cards    │   │
│  │  ScheduleWidget, NewsWidget, etc.           │   │
│  └──────────────────────────────────────────────┘   │
│                                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │       API Service (axios + mock fallback)    │   │
│  │  - Auto mock mode on backend failure         │   │
│  │  - Error logging for debugging               │   │
│  └──────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

## Технические требования к решению

### Backend Stack
- **FastAPI 0.104+**: Современный async фреймворк с автоматической документацией
- **Python 3.9+**: Async/await для высокой производительности
- **SQLite**: Легковесная БД, легко мигрируется на PostgreSQL
- **Uvicorn**: ASGI сервер для FastAPI
- **Pydantic**: Валидация данных и сериализация
- **httpx**: Async HTTP клиент для MAX API

### Frontend Stack
- **React 18**: Современная библиотека для UI
- **Vite 5**: Быстрый сборщик с HMR
- **Redux Toolkit**: Управление состоянием
- **React Router 6**: Клиентская маршрутизация
- **Axios**: HTTP клиент с интерцепторами
- **qrcode.react**: Генерация QR-кодов

### Инфраструктура
- **Docker**: Контейнеризация приложения
- **Docker Compose**: Оркестрация сервисов
- **GitHub Actions**: CI/CD pipeline
- **GitHub Pages**: Хостинг frontend

### Разделы приложения (инструменты + лента)

- **Главная** (`/home`): дашборд с виджетами по ролям (расписание, новости, услуги, внеучебная жизнь и т.д.). Нижняя навигация общая для всего приложения.
- **Хаб** (`/hub`): лента постов из cold_news (по чатам/источникам), заглушка сторис, виджет мероприятий (ивенты) с переходом в бота.
- **Учёба**: расписание, курсы, услуги, оплата, поступление и т.д. (маршруты `/schedule`, `/courses`, `/services` и др.). В нижней навигации активна вкладка «Учёба».

Нижняя панель всегда отображает три вкладки: **Главная**, **Хаб**, **Учёба**.

### Интеграция cold_news

Код cold_news взят из [Moroz314/cold_news](https://github.com/Moroz314/cold_news) и интегрирован как сервис в репозиторий max-university (без сохранения истории git). Расположение: `services/cold-news/`.

- **Назначение**: бот для мониторинга и классификации новостей из Telegram-каналов (Node.js, Express, MongoDB, Telegraf, GigaChat).
- **REST API для MAX**: в `services/cold-news/feed-api.js` запускается отдельный Express-сервер (порт 3001 по умолчанию), эндпоинты:
  - `GET /api/feed?limit=&offset=&channel=` — лента постов из коллекции `news_posts`;
  - `GET /api/sources` — список источников (каналов).
- **Прокси**: FastAPI проксирует запросы с `/api/hub/feed` и `/api/hub/sources` на cold_news (переменная окружения `COLD_NEWS_FEED_URL`, по умолчанию `http://localhost:3001`).

### Интеграция мероприятий (ивенты)

Мероприятия подключаются по внешнему API проекта ивентов. В MAX:

- Backend проксирует запросы на внешний API при заданной переменной `EVENTS_API_URL`.
- Эндпоинт: `GET /api/external/events?limit=` возвращает список мероприятий и ссылку на бота (`bot_link`).
- Виджет `HubEventsWidget` отображает карточки мероприятий и кнопку «Открыть в боте». Контракт API для проекта ивентов описан в [docs/events-api.md](events-api.md).

## Логика работы приложения

### 1. Система авторизации через коды приглашения

```
┌──────────────┐
│ Пользователь │
│ открывает    │
│ приложение   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ WelcomePage          │
│ Запрос кода          │
│ приглашения          │
└──────┬───────────────┘
       │ Ввод кода
       ▼
┌──────────────────────┐
│ POST /api/           │
│ invitation/use       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐       НЕТ
│ Код валиден?         ├─────────► Ошибка
└──────┬───────────────┘
       │ ДА
       ▼
┌──────────────────────┐
│ Получение роли       │
│ и university_id      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Обновление user      │
│ can_change_role=0    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Редирект на /home    │
│ с параметрами роли   │
└──────────────────────┘
```

### 2. Динамическая загрузка конфигурации

```
┌────────────┐
│ HomePage   │
└─────┬──────┘
      │
      ▼
┌────────────────────────────┐
│ GET /api/universities/     │
│ {id}/blocks?role={role}    │
└─────┬──────────────────────┘
      │
      ▼
┌────────────────────────────┐
│ Получение sections:        │
│ [                          │
│   {                        │
│     name: "Главное",       │
│     blocks: [              │
│       {type: "schedule"},  │
│       {type: "news"}       │
│     ]                      │
│   }                        │
│ ]                          │
└─────┬──────────────────────┘
      │
      ▼
┌────────────────────────────┐
│ BlockWidget router         │
│ Выбор виджета по type      │
└─────┬──────────────────────┘
      │
      ├─► ScheduleWidget
      ├─► NewsWidget
      ├─► ServicesWidget
      └─► ...
```

### 3. Админ-панель с drag & drop

```
┌─────────────────┐
│ AdminConfigPage │
└────────┬────────┘
         │
         ▼
┌────────────────────────────┐
│ Получение конфигурации     │
│ GET /api/admin/config/     │
│ {uni_id}/{role}            │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Отображение:               │
│ - Список разделов (drag)   │
│ - Список блоков (drag)     │
│ - Цвет хедера              │
└────────┬───────────────────┘
         │
         ├─► Добавить раздел
         │   POST /api/admin/sections
         │
         ├─► Изменить порядок блоков
         │   POST /api/admin/blocks/reorder
         │   {block_ids: [3,1,2]}
         │
         ├─► Удалить блок
         │   DELETE /api/admin/blocks/{id}
         │
         └─► Обновить цвет
             PUT /api/admin/config/.../
             header-color
```

### 4. Система мок-режима

```
┌──────────────┐
│ API Request  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐   Успех
│ Axios Interceptor├────────► Response
└──────┬───────────┘
       │ Ошибка (timeout/network)
       ▼
┌──────────────────┐
│ setMockMode(true)│
└──────┬───────────┘
       │
       ├─► Показать MockModeNotification
       │   - Предупреждение
       │   - Кнопка скачать логи
       │   - Автоскрытие через 3 сек
       │
       └─► Вернуть mock data
           из локальных fallback
```

### 5. Кастомные блоки с модерацией

```
┌──────────────────┐
│ Админ вуза       │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────┐
│ CustomBlocksPage           │
│ Форма отправки:            │
│ - block_type               │
│ - name                     │
│ - code (JSX)               │
│ - config_schema (JSON)     │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ POST /api/admin/           │
│ custom-blocks/submit       │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ custom_blocks таблица      │
│ status: 'pending'          │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Суперадмин                 │
│ GET .../pending            │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Проверка кода:             │
│ - Нет eval()               │
│ - Нет прямого DOM access   │
│ - Соответствие стандартам  │
└────────┬───────────────────┘
         │
         ├─► Одобрить
         │   POST .../review
         │   status: 'approved'
         │
         └─► Отклонить
             POST .../review
             status: 'rejected'
             review_notes: "..."
```

## Направления для масштабирования

### 1. Горизонтальное масштабирование

**Текущая архитектура позволяет**:
- Запуск нескольких экземпляров FastAPI за load balancer (nginx/traefik)
- Использование Redis для shared session storage
- Вынос статических файлов на CDN

**Переход к микросервисам**:
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Auth       │  │   Content    │  │   Admin      │
│  Service     │  │   Service    │  │  Service     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                    ┌────▼────┐
                    │ Message │
                    │  Queue  │
                    │ (Redis) │
                    └─────────┘
```

### 2. Миграция базы данных

**SQLite → PostgreSQL**:
```python
# database.py уже структурирован для легкой миграции
# Нужно только заменить sqlite3 на psycopg2

# ДО:
conn = sqlite3.connect(USERS_DB_PATH)

# ПОСЛЕ:
import psycopg2
conn = psycopg2.connect(
    dbname="max_university",
    user="postgres",
    password="***",
    host="db.example.com"
)
```

**Добавление репликации**:
- Master для записи
- Read replicas для чтения
- Connection pooling (SQLAlchemy)

### 3. Кеширование

**Уровни кеширования**:
1. **Browser cache**: Static assets (CSS, JS, images)
2. **CDN cache**: Frontend bundle на CloudFlare/AWS CloudFront
3. **Redis cache**: 
   - Конфигурации блоков (TTL: 1 час)
   - Новости и расписания (TTL: 5 минут)
   - Статистика (TTL: 15 минут)

```python
# Пример с Redis кешем
import redis
cache = redis.Redis(host='localhost', port=6379)

@app.get("/api/universities/{id}/blocks")
async def get_blocks(id: int, role: str):
    cache_key = f"blocks:{id}:{role}"
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)
    
    data = database.get_blocks_config(id, role)
    cache.setex(cache_key, 3600, json.dumps(data))
    return data
```

### 4. Асинхронная обработка

**Очереди задач для**:
- Отправка уведомлений (Celery + Redis/RabbitMQ)
- Генерация отчетов
- Импорт больших файлов со студентами
- Обработка кастомных блоков

```python
# Пример с Celery
from celery import Celery

celery_app = Celery('tasks', broker='redis://localhost:6379')

@celery_app.task
def send_notifications(user_ids: List[int], message: str):
    for user_id in user_ids:
        # Отправка через MAX Bot API
        pass

# В API endpoint
@app.post("/api/admin/notify-all")
async def notify_all(message: str):
    user_ids = database.get_all_user_ids()
    send_notifications.delay(user_ids, message)
    return {"status": "queued"}
```

### 5. Мониторинг и логирование

**Стек мониторинга**:
- **Prometheus**: Метрики (latency, error rate, throughput)
- **Grafana**: Дашборды
- **Sentry**: Error tracking
- **ELK Stack**: Централизованное логирование

```python
# Добавление метрик
from prometheus_client import Counter, Histogram

request_count = Counter('http_requests_total', 
                       'Total HTTP requests')
request_duration = Histogram('http_request_duration_seconds',
                             'HTTP request latency')

@app.middleware("http")
async def add_metrics(request: Request, call_next):
    request_count.inc()
    with request_duration.time():
        response = await call_next(request)
    return response
```

### 6. CI/CD и автотесты

**Текущая CI/CD**:
- GitHub Actions для деплоя на GitHub Pages

**Расширенная CI/CD**:
```yaml
# .github/workflows/test-and-deploy.yml
name: Test and Deploy

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Python tests
        run: |
          pip install pytest pytest-cov
          pytest --cov=. tests/
      - name: Run frontend tests
        run: |
          npm install
          npm test
  
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          # Deploy logic
```

**Автотесты**:
```python
# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_use_invitation_code():
    response = client.post("/api/invitation/use", 
                          json={"code": "TEST-CODE-123"},
                          headers={"X-MAX-User-ID": "1"})
    assert response.status_code == 200
    assert response.json()["role"] == "student"
```

### 7. Безопасность

**Текущие меры**:
- CORS настройки
- Валидация через Pydantic
- HTTPS (GitHub Pages)

**Улучшения**:
- **Rate limiting**: Защита от DDoS
- **JWT tokens**: Вместо простого user_id в заголовках
- **SQL injection protection**: Параметризованные запросы (уже используется)
- **XSS protection**: Санитизация кастомных блоков перед одобрением
- **CSRF tokens**: Для критичных операций

```python
# Rate limiting с slowapi
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/invitation/use")
@limiter.limit("5/minute")
async def use_code(request: Request, ...):
    # Максимум 5 попыток в минуту
    pass
```

### 8. Поддержка множества университетов

**Текущая реализация**: База данных поддерживает несколько вузов

**Масштабирование**:
- **Multi-tenancy**: Изоляция данных по university_id
- **Отдельные домены**: uni1.max-university.ru, uni2.max-university.ru
- **Белые метки**: Кастомные цвета, логотипы для каждого вуза
- **Региональные серверы**: Размещение ближе к пользователям

```python
# Middleware для определения tenant
@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    subdomain = request.url.hostname.split('.')[0]
    university = database.get_university_by_subdomain(subdomain)
    request.state.university_id = university.id
    return await call_next(request)
```

## Заключение

Архитектура Цифрового университета MAX спроектирована с учетом будущего роста:
- Модульная структура позволяет легко добавлять новые функции
- Асинхронный backend обеспечивает высокую производительность
- Простая миграция на более мощные решения (PostgreSQL, Redis, Kubernetes)
- Готовность к горизонтальному масштабированию
- Система кеширования для оптимизации нагрузки
- Мониторинг и логирование для контроля качества

Решение готово обслуживать от одного до сотен университетов с тысячами пользователей в каждом.




