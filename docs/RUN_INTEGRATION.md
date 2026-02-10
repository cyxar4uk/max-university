# Запуск интеграции «Мероприятия» в MAX

Чтобы в приложении MAX отображались мероприятия из navbot_ranepa (баннер, даты, «Записаться», «Подробнее»), нужно поднять оба проекта.

## 1. Мероприятия (navbot_ranepa)

Уже запущено в Docker:

- Бэкенд: **http://localhost:8001**
- Публичное API мероприятий: **http://localhost:8001/api/public/events**

Если нужно перезапустить:

```bash
cd c:\Users\UserPk\Downloads\navbot_ranepa
docker-compose up -d
```

В `docker-compose.yml` для бэкенда заданы `EVENTS_API_SECRET` и `EVENTS_BOT_LINK` (по умолчанию `events-secret-123` и ссылка на бота).

## 2. MAX (max-university)

### Бэкенд

Из каталога `max-university/backend`:

```powershell
$env:DATABASE_URL = ""
$env:EVENTS_API_URL = "http://localhost:8001/api/public"
$env:EVENTS_API_SECRET = "events-secret-123"
python main.py
```

Либо создать `backend/.env.events`:

```
EVENTS_API_URL=http://localhost:8001/api/public
EVENTS_API_SECRET=events-secret-123
```

И перед запуском сбросить PostgreSQL: `$env:DATABASE_URL = ""` (иначе нужен валидный `postgresql://` URL).

Бэкенд MAX: **http://localhost:8000**

### Фронтенд

```powershell
cd max-university\frontend
npx vite
```

Открыть в браузере: **http://localhost:3000** (или порт, который выведет Vite, например 3001).

## 3. Проверка

- Главная MAX → блок «Внеучебная жизнь» или раздел «События»: должны подтянуться мероприятия с датами и кнопками «Записаться» и «Подробнее».
- «Записаться» ведёт на бота мероприятий (или при настройке отправляет запрос на регистрацию в БД).
- «Подробнее» открывает детали мероприятия с сервера navbot_ranepa.

## Порты

| Сервис           | Порт |
|------------------|------|
| navbot_ranepa API | 8001 |
| max-university API | 8000 |
| max-university frontend | 3000 или 3001 |
