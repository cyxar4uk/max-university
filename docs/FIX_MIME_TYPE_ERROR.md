# Исправление ошибки MIME type на GitHub Pages

## Проблема

Ошибка в консоли:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/jsx". Strict MIME type checking is enforced for module scripts per HTML spec.
```

## Причина

GitHub Pages пытается отдать исходный файл `main.jsx` вместо собранного JavaScript файла. Это происходит потому, что:

1. Vite должен собирать проект и создавать `.js` файлы
2. Vite должен автоматически обновить `index.html` с правильными путями
3. Но похоже, что сборка не происходит или не работает правильно

## Что было исправлено

1. ✅ Создан файл `.nojekyll` - отключает Jekyll на GitHub Pages
2. ✅ Обновлен GitHub Actions workflow - теперь копирует `.nojekyll` в `dist/`
3. ✅ Добавлен `emptyOutDir: true` в `vite.config.js` для чистой сборки

## Что нужно сделать

### 1. Закоммитьте изменения:

```bash
git add .
git commit -m "Fix MIME type error: add .nojekyll and update build config"
git push
```

### 2. Проверьте GitHub Actions:

- Перейдите на https://github.com/cyxar4uk/max-university/actions
- Дождитесь завершения workflow "Deploy to GitHub Pages"
- Убедитесь, что сборка прошла успешно

### 3. Проверьте сайт:

- Откройте https://cyxar4uk.github.io/max-university/
- Нажмите F12 и проверьте консоль
- Ошибка MIME type должна исчезнуть

## Если ошибка все еще есть

### Вариант 1: Проверьте локальную сборку

```bash
# Соберите проект локально
npm run build

# Проверьте содержимое dist/index.html
# Должен быть путь к .js файлу, а не .jsx
cat dist/index.html | grep "main"
# Должно быть что-то вроде: <script type="module" src="/max-university/assets/main-xxxxx.js"></script>
```

### Вариант 2: Проверьте Network вкладку

1. F12 → Network
2. Обновите страницу (Ctrl+F5)
3. Найдите запрос к `main.jsx` или `main-*.js`
4. Проверьте Content-Type в Headers
5. Должно быть `application/javascript` или `text/javascript`, а не `text/jsx`

### Вариант 3: Проверьте файлы в dist/

После сборки в папке `dist/` должны быть:
- `index.html` (с обновленными путями к .js файлам)
- `assets/` (с .js и .css файлами)
- `.nojekyll`

## Дополнительная информация

### Ошибка `ERR_NAME_NOT_RESOLVED` для bridge.max.ru

Это нормально! Это ожидаемо, когда приложение запускается вне MAX мессенджера. Мок-реализация должна работать.

### Предупреждение "MAX Bridge not available"

Это тоже нормально! Это означает, что мок-реализация активирована и работает.

## После исправлений должно работать:

✅ Страница загружается (не белый экран)
✅ Видна форма ввода кода приглашения
✅ Консоль не показывает ошибку MIME type
✅ Все функции работают с мок-данными




