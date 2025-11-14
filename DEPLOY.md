# Инструкция по деплою на GitHub Pages

## Шаги для деплоя мини-приложения на GitHub Pages

### 1. Создание репозитория на GitHub

1. Создайте новый репозиторий на GitHub (например, `max-university`)
2. Склонируйте репозиторий локально:
   ```bash
   git clone https://github.com/YOUR_USERNAME/max-university.git
   cd max-university
   ```

### 2. Подготовка проекта

1. Убедитесь, что все файлы добавлены в репозиторий:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

### 3. Настройка GitHub Pages

1. Перейдите в настройки репозитория: `Settings` → `Pages`
2. В разделе `Source` выберите `GitHub Actions`
3. Сохраните изменения

### 4. Обновление URL в коде

После деплоя обновите URL в файле `main.py`:

Замените `YOUR_USERNAME` на ваш GitHub username во всех местах, где встречается:
- `https://YOUR_USERNAME.github.io/max-university/`

Например:
- `https://username.github.io/max-university/?role=student`

### 5. Настройка бота MAX

1. В настройках бота MAX укажите URL вашего мини-приложения:
   ```
   https://YOUR_USERNAME.github.io/max-university/
   ```

2. Обновите webhook URL для бота (если используете):
   ```
   https://your-backend-url.com/api/bot/webhook
   ```

### 6. Автоматический деплой

После настройки GitHub Actions, каждый push в ветку `main` или `master` автоматически запустит деплой.

Проверить статус деплоя можно в разделе `Actions` репозитория.

### 7. Проверка работы

1. Откройте URL: `https://YOUR_USERNAME.github.io/max-university/`
2. Проверьте, что приложение загружается
3. Протестируйте функционал через бота MAX

## Важные замечания

⚠️ **HTTPS обязателен**: MAX Bridge требует HTTPS для работы. GitHub Pages предоставляет HTTPS по умолчанию.

⚠️ **CORS**: Убедитесь, что бэкенд разрешает запросы с вашего домена GitHub Pages.

⚠️ **Переменные окружения**: Для продакшена используйте переменные окружения GitHub Actions для секретных данных.

## Обновление после изменений

После любых изменений в коде:

```bash
git add .
git commit -m "Описание изменений"
git push origin main
```

GitHub Actions автоматически соберет и задеплоит новую версию.

## Troubleshooting

### Приложение не загружается

1. Проверьте логи в разделе `Actions`
2. Убедитесь, что сборка прошла успешно
3. Проверьте консоль браузера на наличие ошибок

### Ошибки CORS

Добавьте ваш GitHub Pages домен в CORS настройки бэкенда:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://YOUR_USERNAME.github.io",
        "http://localhost:3000"  # для разработки
    ],
    ...
)
```

### Проблемы с роутингом

Убедитесь, что в `vite.config.js` указан правильный `base`:

```javascript
base: '/',
```

Или если репозиторий не в корне:

```javascript
base: '/max-university/',
```

