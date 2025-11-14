# Быстрый старт для деплоя на GitHub Pages

## Для получения HTTPS ссылки на мини-приложение

### Шаг 1: Создайте репозиторий на GitHub

1. Перейдите на https://github.com/new
2. Назовите репозиторий (например, `max-university`)
3. Создайте репозиторий

### Шаг 2: Загрузите код

```bash
# Инициализируйте git (если еще не сделано)
git init
git add .
git commit -m "Initial commit"

# Добавьте remote
git remote add origin https://github.com/YOUR_USERNAME/max-university.git
git branch -M main
git push -u origin main
```

### Шаг 3: Включите GitHub Pages

1. Перейдите в `Settings` → `Pages`
2. В разделе `Source` выберите `GitHub Actions`
3. Сохраните

### Шаг 4: Обновите URL в main.py

После первого деплоя (через несколько минут):

1. Откройте файл `main.py`
2. Найдите все вхождения `YOUR_USERNAME`
3. Замените на ваш GitHub username
4. Закоммитьте и запушьте изменения:

```bash
git add main.py
git commit -m "Update URLs with GitHub username"
git push
```

### Шаг 5: Получите ссылку

Ваша ссылка будет:
```
https://YOUR_USERNAME.github.io/max-university/
```

### Шаг 6: Настройте бота MAX

1. В настройках бота укажите URL мини-приложения
2. Обновите webhook (если используете)

## Проверка деплоя

1. Перейдите в раздел `Actions` репозитория
2. Дождитесь завершения workflow "Deploy to GitHub Pages"
3. Откройте ссылку: `https://YOUR_USERNAME.github.io/max-university/`

## Важно!

⚠️ После деплоя обязательно обновите URL в `main.py`, иначе бот не сможет открыть мини-приложение!

⚠️ Убедитесь, что бэкенд разрешает CORS запросы с вашего GitHub Pages домена.

