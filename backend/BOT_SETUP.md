# Настройка MAX Bot (официальный API)

## Что изменилось

Бот теперь работает через **официальный MAX Bot API** и вебхук (как указано в PRESENTATION_GUIDE.md):
- Используется официальный API: `platform-api.max.ru`
- Бот получает обновления через вебхук `/api/bot/webhook`
- Все команды и callback обрабатываются через официальный API клиент

## Структура модулей

```
backend/
├── main.py              # FastAPI приложение + вебхук бота
├── bot/                 # Модуль чат-бота
│   ├── __init__.py
│   ├── api_client.py    # Официальный MAX Bot API клиент
│   ├── handlers.py      # Обработчики команд и callback
│   └── keyboards.py     # Inline клавиатуры
└── database.py          # Работа с БД
```

## Настройка

1. **Установите зависимости:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Создайте `backend/.env.bot` с токеном бота:**
   ```bash
   MAX_BOT_TOKEN=ваш_токен_бота
   ```

3. **Настройте вебхук в MAX:**
   - В настройках бота укажите URL вебхука: `https://ваш-домен.ru/api/bot/webhook`
   - Или используйте настройки платформы MAX для указания вебхука

4. **Запустите приложение:**
   ```bash
   python main.py
   # или через uvicorn:
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```

## Как работает бот

1. MAX отправляет обновления на `/api/bot/webhook`
2. Вебхук обрабатывает команды и callback через `bot.handlers.handle_webhook_update()`
3. Ответы отправляются через официальный API клиент (`bot.api_client.MAXBotAPIClient`)
4. Клавиатуры формируются в `bot.keyboards` и отправляются как `reply_markup`

## Команды бота

- `/start` - Главное меню, выбор роли при первом запуске (с inline-кнопками)
- `/help` - Список команд
- `/schedule` - Расписание (с быстрыми действиями)
- `/profile` - Профиль пользователя

## Callback обработка

Бот обрабатывает нажатия inline-кнопок:
- `role_*` - Выбор роли (parent, applicant, student, teacher, employee)
- `block_*` - Выбор блока (profile, schedule, lms, services, life, news, и т.д.)
- `back_to_menu` - Возврат в главное меню

## Официальный API

Используется официальный MAX Bot API:
- **Документация**: https://dev.max.ru/docs-api
- **Базовый URL**: `https://platform-api.max.ru`
- **Авторизация**: `Authorization: <token>` заголовок
- **Формат клавиатур**: `attachments` с `type="inline_keyboard"` и `payload.buttons`

## Примечания

- Веб-API эндпоинты остались в `main.py` - позже можно перенести в `app.py` для разделения
- Все клавиатуры работают через официальный формат MAX API
- Бот полностью совместим с официальной документацией MAX
