# Запуск ленты постов (cold_news)

Лента постов на **Главной** и в **Хабе** загружается из сервиса cold_news. Чтобы она работала, нужно запустить API cold_news и указать его адрес бэкенду MAX.

**Свои источники и своя БД:** см. [COLD_NEWS_PARSER.md](COLD_NEWS_PARSER.md) — как устроен парсер, как заменить MongoDB на свою и как задать список каналов в одном файле `channels.config.js`.

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

---

## 5. Пошаговая настройка на сервере (VPS)

**Как это устроено на сервере:** На одной машине работают два процесса:
- **Бэкенд MAX** (FastAPI) — порт 8000, отдаёт API сайта и фронт.
- **Feed API** (Node.js) — порт 3001, отдаёт ленту постов из MongoDB.

Они на одной машине. Бэкенд обращается к ленте по адресу **127.0.0.1:3001** — то есть «локально» на этом же сервере. Снаружи порт 3001 не открывают; пользователи ходят только на ваш домен (nginx → бэкенд, бэкенд сам дергает Feed API внутри сервера).

Делаем по шагам. Если на каком-то шаге будет ошибка — пришлите вывод команды и текст ошибки.

---

### Шаг 1. Подключитесь к серверу и перейдите в каталог проекта

```bash
ssh ваш_пользователь@ваш_сервер
cd /путь/к/репозиторию
```

Замените `/путь/к/репозиторию` на реальный путь (например `/www/wwwroot/max-university` или тот, куда деплоится код).  
**Пришлите:** вывод `pwd` после `cd`, чтобы мы использовали один и тот же путь в следующих шагах.

---

### Шаг 2. Проверьте Node.js

```bash
node -v
```

Должна быть версия 18 или выше (например `v20.10.0`).  
Если команды нет или версия старая — напишите, какая ОС на сервере (Ubuntu/Debian/CentOS), подскажу команды установки.  
**Пришлите:** вывод `node -v`.

---

### Шаг 3. Установите systemd-сервис для Feed API

Подставьте **реальный путь к репозиторию** вместо `/path/to/repo` (тот же, что в шаге 1). Пример: `/www/wwwroot/max-university`.

```bash
sudo cp deploy/cold-news-feed-api.service /etc/systemd/system/
sudo sed -i 's|/path/to/repo|/ВАШ_ПУТЬ_К_РЕПО|g' /etc/systemd/system/cold-news-feed-api.service
```

Проверьте, что пути подставились:

```bash
cat /etc/systemd/system/cold-news-feed-api.service
```

В файле не должно остаться `/path/to/repo` — только ваш путь.  
**Важно:** в unit указаны `User=www` и `Group=www`. Если на сервере бэкенд крутится под другим пользователем (например `root` или вашим логином) — скажите, подправим unit.

Затем:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cold-news-feed-api
sudo systemctl start cold-news-feed-api
```

Проверка статуса:

```bash
sudo systemctl status cold-news-feed-api
```

**Пришлите:** вывод `systemctl status` (первые 15–20 строк). Ожидаем `active (running)`.

---

### Шаг 4. Файл .env для cold-news (MongoDB)

Создайте файл с переменными для Feed API (в том же каталоге репо):

```bash
nano services/cold-news/.env
```

Добавьте строку (подставьте свою строку подключения к MongoDB):

```
MONGOdb=mongodb://логин:пароль@хост:27017/база
```

Если MongoDB пока нет — можно оставить файл пустым или только комментарий; тогда лента будет пустой, но сервис будет работать и не падать.  
Сохраните файл (в nano: Ctrl+O, Enter, Ctrl+X).

Перезапустите сервис, чтобы подхватить `.env`:

```bash
sudo systemctl restart cold-news-feed-api
```

---

### Шаг 5. Сказать бэкенду адрес ленты (COLD_NEWS_FEED_URL)

Бэкенд должен знать, куда стучаться за лентой. На сервере это `http://127.0.0.1:3001`.

**Вариант A.** Бэкенд запускается через systemd (файл `max-university-backend.service`).

Откройте unit бэкенда:

```bash
sudo nano /etc/systemd/system/max-university-backend.service
```

В секцию `[Service]` добавьте строку (можно после `EnvironmentFile=...`):

```ini
Environment="COLD_NEWS_FEED_URL=http://127.0.0.1:3001"
```

Сохраните, затем:

```bash
sudo systemctl daemon-reload
sudo systemctl restart max-university-backend
```

**Вариант B.** Переменные бэкенда задаются через файл (например `backend/.env` или `backend/.env.events`).

Добавьте в тот файл, откуда бэкенд реально читает переменные:

```
COLD_NEWS_FEED_URL=http://127.0.0.1:3001
```

И перезапустите бэкенд (как обычно на вашем сервере).

**Пришлите:** каким способом у вас запускается бэкенд (systemd / PM2 / вручную) и что сделали на этом шаге — тогда можно будет точно проверить.

---

### Шаг 6. Проверка

На сервере проверьте, что Feed API отвечает:

```bash
curl -s http://127.0.0.1:3001/health
```

Ожидаемый ответ: `{"ok":true,"service":"cold-news-feed-api"}`.

Потом откройте ваше приложение в браузере (Главная или Хаб) — блок «Лента новостей» должен загружаться (если MongoDB подключена и есть посты — появятся посты; если нет — заглушка или пустой список, но без ошибки).

Если что-то из этого не сработает — пришлите вывод `curl` и скрин или описание, что видите в приложении в блоке ленты.
