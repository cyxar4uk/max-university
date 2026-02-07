# MAX Digital University — бот (TypeScript)

Бот написан на **TypeScript** с официальной библиотекой [max-bot-api-client-ts](https://github.com/max-messenger/max-bot-api-client-ts) (подключается из GitHub, в npm пакет не опубликован).

## Установка

```bash
cd services/max-bot
npm install
# или yarn install
```

## Настройка

1. Скопируйте `.env.example` в `.env`.
2. Заполните `BOT_TOKEN` (токен от PrimeBot в MAX).
3. Укажите `BACKEND_URL` (адрес FastAPI, например `http://127.0.0.1:8000`).
4. Опционально: `BOT_SECRET` для вызова `/api/bot/sync-user` (можно использовать тот же токен бота или задать отдельный секрет в бэкенде).

## Запуск

```bash
# Разработка
yarn dev

# Сборка и запуск
yarn build
yarn start
```

Либо с переменными в одну строку:

```bash
BOT_TOKEN="<token>" BACKEND_URL="http://127.0.0.1:8000" node dist/bot.js
```

## Команды и обработчики

- `bot.command('start', ...)` — приветствие, выбор роли, главное меню.
- `bot.command('help', ...)` — список команд.
- `bot.command('schedule', ...)` — расписание с быстрыми действиями.
- `bot.command('profile', ...)` — профиль пользователя.
- `bot.action(/^role_(.+)$/, ...)` — выбор роли (callback-кнопки).
- `bot.action(/^block_(.+)$/, ...)` — выбор блока (профиль, расписание и т.д.).
- `bot.action('back_to_menu', ...)` — возврат в главное меню.
- `bot.on('message_created', ...)` — ответ на неизвестные сообщения.

Пользователи и роли синхронизируются с бэкендом через `POST /api/bot/sync-user`.

## Деплой

Бот должен быть доступен по HTTPS для приёма вебхуков от MAX. Настройте в MAX URL вебхука на ваш сервер (например, `https://your-domain.ru/bot` или отдельный порт за nginx).

На бэкенде (FastAPI) должен быть включён эндпоинт `POST /api/bot/sync-user` и при необходимости заголовок `X-Bot-Secret`.
