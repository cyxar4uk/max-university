/// <reference path="./context.d.ts" />
import 'dotenv/config';
import { Bot, Keyboard, Context } from '@maxhub/max-bot-api';
import { roleSelectionKeyboard, welcomeOpenAppKeyboard, getRoleName } from './keyboards';
import { syncUser, setUserRole } from './backend';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN must be provided');

const bot = new Bot(token);

bot.api.setMyCommands([
  { name: 'start', description: 'Начать / главное меню' },
]);

/** Приветствие и клавиатура выбора роли (4 кнопки) или кнопка «Открыть приложение», если роль уже выбрана */
async function sendWelcome(ctx: Context) {
  const userId = ctx.user?.user_id ?? ctx.chatId;
  if (!userId) return ctx.reply('Не удалось определить пользователя.');

  const firstName = ctx.user?.first_name ?? '';
  const lastName = ctx.user?.last_name ?? '';
  const username = ctx.user?.username ?? undefined;

  const user = await syncUser({
    max_user_id: userId,
    first_name: firstName,
    last_name: lastName || undefined,
    username: username || undefined,
    university_id: 1,
  });

  const role = user?.role ?? null;

  if (!role) {
    return ctx.reply(
      `👋 Привет${firstName ? `, ${firstName}` : ''}!\n\nДобро пожаловать в **Цифровой университет** на платформе MAX.\n\nВыберите свою роль:`,
      { attachments: [roleSelectionKeyboard()], format: 'markdown' }
    );
  }

  return ctx.reply(
    `👋 Привет${firstName ? `, ${firstName}` : ''}!\n\nДобро пожаловать в **Цифровой университет**. Ваша роль: **${getRoleName(role)}**.\n\nНажмите кнопку ниже, чтобы открыть приложение:`,
    { attachments: [welcomeOpenAppKeyboard(role)], format: 'markdown' }
  );
}

/* ----- /start ----- */
bot.command('start', (ctx: Context) => sendWelcome(ctx));

/* ----- bot_started (запуск бота / открытие чата с ботом) — то же приветствие и выбор роли ----- */
bot.on('bot_started', (ctx: Context & { startPayload?: string }) => sendWelcome(ctx));

/* ----- Выбор роли: нажатие на callback-кнопку (Абитуриент / Студент / Сотрудник / Администрация) ----- */
bot.action(/^role_(.+)$/, async (ctx: Context & { match?: string[] }) => {
  const role = ctx.match?.[1] ?? '';
  const userId = ctx.user?.user_id ?? ctx.chatId;
  if (!userId) return;

  await setUserRole(userId, role, 1);
  await ctx.answerOnCallback({ notification: `Роль выбрана: ${getRoleName(role)}` });

  return ctx.reply(
    `✅ Вы выбрали роль: **${getRoleName(role)}**.\n\nНажмите кнопку ниже, чтобы открыть приложение:`,
    { attachments: [welcomeOpenAppKeyboard(role)], format: 'markdown' }
  );
});

/* ----- Любое другое сообщение ----- */
bot.on('message_created', (ctx: Context) => {
  const text = ctx.message?.body?.text?.trim();
  if (text?.startsWith('/')) {
    return ctx.reply('Я не знаю такой команды. Используйте /start.');
  }
  if (text) {
    return ctx.reply('Я не знаю такой команды. Используйте /start.');
  }
  return undefined;
});

bot.start();
