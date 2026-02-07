import 'dotenv/config';
import { Bot, Keyboard } from '@maxhub/max-bot-api';
import {
  roleSelectionKeyboard,
  welcomeOpenAppKeyboard,
  mainMenuKeyboard,
  quickActionsKeyboard,
  getBlockTitle,
  getRoleName,
} from './keyboards';
import { syncUser, setUserRole } from './backend';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN must be provided');

const bot = new Bot(token);

bot.api.setMyCommands([
  { name: 'start', description: 'Главное меню' },
  { name: 'help', description: 'Помощь' },
  { name: 'schedule', description: 'Расписание' },
  { name: 'profile', description: 'Мой профиль' },
]);

/* ----- /start ----- */
bot.command('start', async (ctx) => {
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
      `👋 Привет, ${firstName || 'друг'}!\n\nДобро пожаловать в **Цифровой университет** на платформе MAX.\n\nВыберите свою роль — затем откроется приложение:`,
      { attachments: [roleSelectionKeyboard()], format: 'markdown' }
    );
  }

  await ctx.reply(
    `👋 Привет, ${firstName || 'друг'}!\n\nДобро пожаловать в **Цифровой университет**.\n\nНажмите кнопку ниже, чтобы открыть приложение:`,
    { attachments: [welcomeOpenAppKeyboard(role)], format: 'markdown' }
  );
  return ctx.reply(`Или выберите раздел:\n\nВаша роль: ${getRoleName(role)}`, {
    attachments: [mainMenuKeyboard(role)],
    format: 'markdown',
  });
});

/* ----- /help ----- */
bot.command('help', (ctx) => {
  return ctx.reply(
    `📚 **Доступные команды:**

/start - Главное меню
/help - Помощь
/profile - Мой профиль
/schedule - Расписание на сегодня
/assignments - Мои задания
/events - События
/services - Электронные услуги

**Быстрые команды:**
/next - Следующее занятие
/deadline - Ближайший дедлайн
/card - Студенческий билет
/news - Последние новости`,
    { format: 'markdown' }
  );
});

/* ----- /schedule ----- */
bot.command('schedule', (ctx) => {
  return ctx.reply('📅 Расписание', {
    attachments: [quickActionsKeyboard('schedule')],
    format: 'markdown',
  });
});

/* ----- /profile ----- */
bot.command('profile', async (ctx) => {
  const userId = ctx.user?.user_id ?? ctx.chatId;
  if (!userId) return ctx.reply('Не удалось определить пользователя.');

  const user = await syncUser({ max_user_id: userId });
  if (user) {
    const role = user.role ?? 'не выбрана';
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return ctx.reply(`👤 Профиль\n\nИмя: ${name}\nРоль: ${getRoleName(role)}`, {
      attachments: [quickActionsKeyboard('profile')],
      format: 'markdown',
    });
  }
  return ctx.reply('👤 Профиль\n\nВы не зарегистрированы. Используйте /start', {
    attachments: [quickActionsKeyboard('profile')],
    format: 'markdown',
  });
});

/* ----- Выбор роли: action role_* ----- */
bot.action(/^role_(.+)$/, async (ctx) => {
  const role = (ctx as { match?: string[] }).match?.[1] ?? '';
  const userId = ctx.user?.user_id ?? ctx.chatId;
  if (!userId) return;

  await setUserRole(userId, role, 1);
  await ctx.answerOnCallback({ notification: `Роль выбрана: ${getRoleName(role)}` });

  const text = `✅ Вы выбрали роль: **${getRoleName(role)}**\n\nНажмите кнопку ниже, чтобы открыть приложение — в нём будут сохранены ваше имя, фамилия и роль.`;
  await ctx.reply(text, {
    attachments: [welcomeOpenAppKeyboard(role)],
    format: 'markdown',
  });
});

/* ----- Выбор блока: action block_* ----- */
bot.action(/^block_(.+)$/, async (ctx) => {
  const block = (ctx as { match?: string[] }).match?.[1] ?? '';
  const title = getBlockTitle(block);

  await ctx.answerOnCallback({ notification: `Открываю ${title}` });

  const text = `**${title}**\n\nВыберите действие или откройте полную версию в приложении:`;
  return ctx.reply(text, {
    attachments: [quickActionsKeyboard(block)],
    format: 'markdown',
  });
});

/* ----- Назад в меню ----- */
bot.action('back_to_menu', async (ctx) => {
  const userId = ctx.user?.user_id ?? ctx.chatId;
  if (!userId) return;

  await ctx.answerOnCallback({ notification: 'Возвращаюсь в меню' });

  const user = await syncUser({ max_user_id: userId });
  const role = user?.role ?? 'student';

  return ctx.reply('📱 Главное меню\n\nВыберите раздел:', {
    attachments: [mainMenuKeyboard(role)],
    format: 'markdown',
  });
});

/* ----- Любое другое сообщение ----- */
bot.on('message_created', (ctx) => {
  const text = ctx.message?.body?.text?.trim();
  if (text?.startsWith('/')) {
    return ctx.reply('Я не знаю такой команды.\n\nИспользуйте /start или /help.');
  }
  if (text) {
    return ctx.reply('Я не знаю такой команды.\n\nИспользуйте /start или /help.');
  }
});

/* ----- bot_started (start_payload) ----- */
bot.on('bot_started', async (ctx) => {
  const payload = (ctx as unknown as { startPayload?: string }).startPayload;
  if (payload) {
    return ctx.reply(`Bot started with payload: ${payload}`);
  }
});

bot.start();
