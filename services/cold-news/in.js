import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';

const apiId = '';
const apiHash = '';

// Создаем новую пустую сессию
const session = new StringSession(""); // Пустая строка = новая сессия
const client = new TelegramClient(session, apiId, apiHash, {});

(async () => {
  await client.start({
    phoneNumber: "+79939560327", // Ваш номер телефона
    password: async () => await input.text('Введите пароль 2FA: '),
    phoneCode: async () => await input.text("Введите код из Telegram: "),
    onError: (err) => console.error("Ошибка:", err),
  });

  // Получаем строку сессии (сохраните её!)
  const sessionString = client.session.save();
  console.log("🔥 Новая сессия:", sessionString);

  await client.disconnect(); // Отключаемся после получения сессии
})();