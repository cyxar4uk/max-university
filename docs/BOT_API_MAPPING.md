# Соответствие MAX Bot API: TypeScript ↔ Python

Документация по официальной библиотеке **@maxhub/max-bot-api** (TypeScript) лежит в **docs/external_docs.md**.  
Наш бэкенд реализует тот же протокол на Python (вебхук + HTTP API).

## События вебхука (обновления)

| Событие в TS lib | Описание | Где обрабатывается в нашем коде |
|------------------|----------|----------------------------------|
| `message_created` | Новое сообщение от пользователя | `bot/handlers.py` → `_parse_webhook_body()`, затем команды или ответ «Не знаю такой команды» |
| `message_callback` | Нажатие callback-кнопки (payload) | `bot/handlers.py` → `handle_callback()` |
| `bot_started` | Начало диалога с ботом | Можно добавить обработку по полю `event` в body |
| `user_added` | Пользователь добавлен в беседу | Можно добавить при необходимости |

В теле вебхука мы поддерживаем:
- `body.message` / `body.msg` — сообщение
- `body.callback_query` / `body.message_callback` — данные нажатия кнопки
- `body.event` — тип события (если платформа присылает)

## Методы отправки сообщений

| Метод в @maxhub/max-bot-api | Наш метод (Python) | Файл |
|-----------------------------|---------------------|------|
| `bot.api.sendMessageToUser(userId, text, options)` | `send_message(user_id, text, reply_markup=..., format='markdown')` или `send_message_to_user()` | `bot/api_client.py` |
| `bot.api.sendMessageToChat(chatId, text)` | `send_message(chat_id, text, ...)` или `send_message_to_chat()` | `bot/api_client.py` |
| `ctx.reply(text, options)` | То же, что отправка в тот же чат (у нас user_id/chat_id из контекста вебхука) | через `send_message()` в обработчиках |

Параметры `options` в TS соответствуют нашим:
- `format: 'markdown'` / `'html'` — передаётся в `send_message(..., format=...)`
- Вложения (attachments) — пока не реализованы в Python; при необходимости можно добавить по аналогии с TS (uploadImage, uploadFile и т.д.)

## Команды и обработчики

| В TS lib | У нас |
|----------|--------|
| `bot.command('start', (ctx) => ...)` | `handle_start_command()` при тексте `/start` |
| `bot.command('help', ...)` | `handle_help_command()` при `/help` |
| `bot.hears('hello', ...)` | Не реализовано; при необходимости можно добавить проверку текста в `handle_webhook_update()` |
| `bot.action('connect_wallet', ...)` | Обработка в `handle_callback()` по `callback_data` (payload), например `role_parent`, `block_profile`, `back_to_menu` |

## Клавиатура (Keyboard)

В TS (external_docs.md):

- **Callback**: `Keyboard.button.callback(text, payload, extra?)` — при нажатии приходит `message_callback` с этим payload.
- **Link**: `Keyboard.button.link(text, url)`.
- **RequestContact** / **RequestGeoLocation** / **Chat** — при необходимости можно добавить в `bot/keyboards.py` и в конвертацию в `api_client._reply_markup_to_attachments()`.

У нас в Python:

- Кнопка с `callback_data` → в API уходит как `type: "callback"`, `payload: <callback_data>`.
- Кнопка с `url` → `type: "link"`, `url: <url>`.
- Кнопка с `web_app.url` → `type: "open_app"`, `url: <url>` (открытие мини-приложения).

Формат клавиатуры: `reply_markup = { "inline_keyboard": [ [ { "text": "...", "callback_data": "..." } ], ... ] }` — см. `bot/keyboards.py`.

## Raw API

В TS: `ctx.api.raw.get/post/put/patch/delete('method', { path, body, query })`.  
У нас прямого аналога нет; при необходимости можно добавить в `MAXBotAPIClient` методы `raw_get`, `raw_post` и т.д. к `base_url` с тем же токеном.

## Итог

- **Вебхук**: один endpoint `/api/bot/webhook`, разбираем `message_created` (сообщения) и `message_callback` (нажатия кнопок).
- **Отправка**: через `MAXBotAPIClient.send_message()` (и алиасы `send_message_to_user` / `send_message_to_chat`).
- **Клавиатуры**: те же типы кнопок (callback, link, open_app), формат описан в external_docs.md и повторён в нашем коде.

Полное описание событий и методов TS-библиотеки — в **docs/external_docs.md**.
