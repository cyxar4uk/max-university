#!/bin/bash
# Скрипт выполняется на VPS в корне репозитория.
# Назначение: обновить код, собрать фронтенд, перезапустить бэкенд.
# Использование: ./deploy/deploy-on-server.sh

set -e
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

# Переменные (можно задать в .env на сервере или здесь)
DOMAIN="${DOMAIN:-max-university.anyway-community.ru}"
API_URL="${VITE_API_URL:-https://$DOMAIN/api}"
WWW_ROOT="${WWW_ROOT:-/www/wwwroot/$DOMAIN}"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

echo "=== Deploy max-university ==="
echo "Repo: $REPO_ROOT"
echo "Domain: $DOMAIN"
echo "WWW root: $WWW_ROOT"

# 1. Обновить код (если деплой через git)
if [ -d .git ]; then
  git fetch origin
  git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || true
  echo "Git updated."
fi

# 2. Собрать фронтенд
echo "Building frontend..."
cd "$FRONTEND_DIR"
export VITE_BASE_URL=/
export VITE_API_URL="$API_URL"
npm ci --production=false
npm run build
echo "Frontend build done."

# 2.5 Установить/обновить зависимости бэкенда (venv)
if [ -d "$REPO_ROOT/venv" ] && [ -f "$BACKEND_DIR/requirements.txt" ]; then
  "$REPO_ROOT/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt" -q
  echo "Backend deps updated."
fi

# 3. Разместить статику в корень сайта
echo "Publishing to $WWW_ROOT..."
mkdir -p "$WWW_ROOT"
if command -v rsync &>/dev/null; then
  rsync -av --delete dist/ "$WWW_ROOT/"
else
  rm -rf "$WWW_ROOT"/* 2>/dev/null; cp -r dist/. "$WWW_ROOT/" 2>/dev/null || cp -r dist/* "$WWW_ROOT/"
fi
echo "Frontend published."

# 4. Перезапустить бэкенд (выберите один способ)

# Вариант A: systemd
if systemctl is-active --quiet max-university-backend 2>/dev/null; then
  sudo systemctl restart max-university-backend
  echo "Backend restarted (systemd)."
fi

# Вариант B: Docker Compose
if [ -f "$REPO_ROOT/docker-compose.yml" ] && command -v docker-compose &>/dev/null; then
  cd "$REPO_ROOT"
  docker-compose up -d --build backend
  echo "Backend restarted (Docker)."
fi

# Вариант C: PM2 (если бэкенд запущен через PM2 в aaPanel)
# pm2 restart max-university-backend 2>/dev/null || true

# 5. TS-бот MAX (services/max-bot)
if [ -d "$REPO_ROOT/services/max-bot" ]; then
  echo "Building and restarting max-bot..."
  cd "$REPO_ROOT/services/max-bot"
  npm install 2>/dev/null || true
  npm run build 2>/dev/null || true
  (sudo systemctl restart max-university-bot 2>/dev/null) || true
  echo "max-bot done."
fi

echo "=== Deploy finished ==="
