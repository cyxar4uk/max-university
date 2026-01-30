# Запуск ленты постов (cold_news)

Лента постов на **Главной** и в **Хабе** загружается из сервиса cold_news. Чтобы она работала, нужно запустить API cold_news и указать его адрес бэкенду MAX.

## 1. Запуск API cold_news

1. Перейдите в каталог сервиса:
   ```bash
   cd services/cold-news
   ```

2. Установите зависимости (если ещё не установлены):
   ```bash
   npm install
   ```

3. Создайте файл `.env` (если его нет) и задайте переменную для MongoDB (тот же `MONGOdb`, что и у бота cold_news):
   ```
   MONGOdb=mongodb://...
   ```

4. Запустите API ленты (отдельно от бота):
   ```bash
   npm run feed-api
   ```
   По умолчанию сервер слушает порт **3001**.

## 2. Настройка бэкенда MAX

Укажите адрес API cold_news в переменной окружения **COLD_NEWS_FEED_URL** при запуске FastAPI:

- Локально: `COLD_NEWS_FEED_URL=http://localhost:3001`
- На сервере: `COLD_NEWS_FEED_URL=http://localhost:3001` (если cold_news и backend на одной машине) или `COLD_NEWS_FEED_URL=http://cold-news:3001` (в Docker).

Пример:
```bash
export COLD_NEWS_FEED_URL=http://localhost:3001
uvicorn backend.main:app --reload
```

## 3. Проверка

- Откройте в браузере: `http://localhost:3001/health` — должен вернуться `{"ok":true,"service":"cold-news-feed-api"}`.
- Откройте приложение: на Главной и в Хабе должна подгружаться лента постов (если в MongoDB есть записи в коллекции `news_posts`).

Если **COLD_NEWS_FEED_URL** не задан или сервис недоступен, бэкенд MAX возвращает пустую ленту (`posts: []`), и на фронте отображается заглушка.

## 4. Запуск на сервере (VPS) через GitHub Actions

При деплое на VPS (workflow `deploy-vps.yml`) после обновления кода и перезапуска бэкенда выполняется:
- установка зависимостей в `services/cold-news` (`npm ci --omit=dev`);
- перезапуск systemd-сервиса `cold-news-feed-api` (если он установлен).

Чтобы лента постов работала на сервере:

1. На VPS установите Node.js (если ещё не установлен).
2. Один раз настройте сервис cold_news:
   - скопируйте `deploy/cold-news-feed-api.service` в `/etc/systemd/system/`;
   - замените `/path/to/repo` на фактический путь к репозиторию (например `$VPS_DEPLOY_PATH`);
   - создайте `.env` в `services/cold-news` с переменной `MONGOdb=...`;
   - выполните: `sudo systemctl daemon-reload`, `sudo systemctl enable cold-news-feed-api`, `sudo systemctl start cold-news-feed-api`.
3. В окружении бэкенда (systemd unit или .env) задайте `COLD_NEWS_FEED_URL=http://127.0.0.1:3001`.

После этого при каждом деплое через GitHub Actions сервис cold-news-feed-api будет перезапускаться вместе с бэкендом.
