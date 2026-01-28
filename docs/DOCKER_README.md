# Docker инструкции

## Предварительные требования

Перед запуском проекта через Docker убедитесь, что у вас установлены:
- Docker Desktop (для Windows/Mac) или Docker Engine (для Linux)
- Docker Compose

### Установка Docker Desktop

**Windows:**
1. Скачайте Docker Desktop с https://www.docker.com/products/docker-desktop
2. Запустите установщик
3. После установки запустите Docker Desktop
4. Дождитесь, пока Docker запустится (иконка в трее должна быть зеленой)

**Mac:**
1. Скачайте Docker Desktop с https://www.docker.com/products/docker-desktop
2. Перетащите Docker.app в папку Applications
3. Запустите Docker Desktop
4. Дождитесь запуска

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Запуск Docker
sudo systemctl start docker
sudo systemctl enable docker
```

## Проверка установки

```bash
# Проверка Docker
docker --version

# Проверка Docker Compose
docker-compose --version

# Проверка что Docker запущен
docker ps
```

## Запуск проекта

### 1. Сборка и запуск всех сервисов

```bash
docker-compose up --build
```

После запуска:
- Frontend: http://localhost
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 2. Запуск в фоновом режиме

```bash
docker-compose up -d --build
```

### 3. Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend
```

### 4. Остановка

```bash
docker-compose down
```

### 5. Остановка с удалением volumes

```bash
docker-compose down -v
```

## Сборка образов по отдельности

### Backend

```bash
# Сборка
docker build -t max-university-backend -f Dockerfile .

# Запуск
docker run -p 8000:8000 \
  -e SECRET_KEY=your-secret-key \
  -e MAX_BOT_TOKEN=f9LHodD0cOI5MJfQ6eqCiVzCVUt8Va__S2Nzwvj06nK6_VfYt4Ra9Sp04TSWBpi5vi_XOuNQ9MNBrHU6hsIu \
  -v $(pwd)/data:/app/data \
  max-university-backend
```

### Frontend

```bash
# Сборка
docker build -t max-university-frontend -f Dockerfile.frontend .

# Запуск
docker run -p 80:80 max-university-frontend
```

## Troubleshooting

### Docker Desktop не запущен

Ошибка:
```
unable to get image: error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/...": The system cannot find the file specified.
```

Решение:
1. Запустите Docker Desktop
2. Дождитесь полного запуска (иконка в трее должна стать зеленой)
3. Попробуйте снова

### Порт уже занят

Ошибка:
```
Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use
```

Решение:
```bash
# Измените порт в docker-compose.yml
# Было: "80:80"
# Стало: "8080:80"

# Или остановите процесс, занимающий порт
# Windows:
netstat -ano | findstr :80
taskkill /PID <PID> /F

# Linux/Mac:
sudo lsof -i :80
sudo kill <PID>
```

### Ошибки сборки

Если возникают ошибки при сборке:

```bash
# Очистите Docker кеш
docker system prune -a

# Пересоберите без кеша
docker-compose build --no-cache

# Запустите
docker-compose up
```

### База данных не создается

Убедитесь, что:
1. Папка data/ существует
2. У Docker есть права на запись
3. Volumes правильно примонтированы

```bash
# Создайте папку вручную
mkdir data

# Проверьте volumes
docker-compose config
```

### Недостаточно памяти

Если Docker жалуется на нехватку памяти:

1. Откройте Docker Desktop
2. Settings > Resources > Advanced
3. Увеличьте Memory до 4 GB
4. Apply & Restart

## Полезные команды

### Перезапуск только одного сервиса

```bash
# Backend
docker-compose restart backend

# Frontend
docker-compose restart frontend
```

### Просмотр запущенных контейнеров

```bash
docker-compose ps
```

### Выполнение команды в контейнере

```bash
# Backend (Python)
docker-compose exec backend python -c "import database; database.init_databases()"

# Frontend (shell)
docker-compose exec frontend sh
```

### Удаление всех контейнеров и образов

```bash
# Осторожно! Удалит все Docker данные
docker-compose down -v --rmi all
```

## Переменные окружения

Создайте файл .env в корне проекта:

```env
SECRET_KEY=your-secret-key-change-in-production
MAX_BOT_TOKEN=f9LHodD0cOI5MJfQ6eqCiVzCVUt8Va__S2Nzwvj06nK6_VfYt4Ra9Sp04TSWBpi5vi_XOuNQ9MNBrHU6hsIu
VITE_API_URL=http://localhost:8000/api
```

Затем обновите docker-compose.yml:

```yaml
services:
  backend:
    env_file:
      - .env
```

## Production deployment

Для production рекомендуется:

1. Использовать отдельные Dockerfile.prod
2. Не монтировать volumes для кода (только для данных)
3. Использовать переменные окружения из секретов
4. Добавить health checks
5. Использовать Docker Swarm или Kubernetes для оркестрации

Пример health check:

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```




