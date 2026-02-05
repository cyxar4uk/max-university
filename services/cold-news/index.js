import TelegramBot from 'node-telegram-bot-api';
import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl/index.js';
import mongoose from 'mongoose';
import UserTheme from './Them_model.js';
import { DEFAULT_CHANNELS } from './channels.config.js';
import { PostModels, startMonitoring, searchChannel , searchMessages} from './components/receiving_post.js';
import { initializeUser } from './components/receiving_post.js';
import { client } from './components/receiving_post.js';
import axios from 'axios';
import dotenv from 'dotenv';

const userPostPagination = new Map();

dotenv.config();

const TOKEN = process.env.TOKEN_serv;

//const TOKEN = process.env.TOKEN_test;
export const bot = new TelegramBot(TOKEN, {polling: true});

const TGStat = process.env.TGStat

const activeUsers = new Set();

const activeSearches = new Map();


async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGOdb);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); 
  }
}

connectDB();

const userStates = new Map();


async function getOrCreateUser(telegramId) {
  try {
    let user = await UserTheme.findOne({telegramId});
    if (!user) {
      user = new UserTheme({telegramId});
      await user.save();
      console.log(`Создан новый пользователь с ID: ${telegramId}`);
    }
    return user;
  } catch (err) {
    console.error('Ошибка в getOrCreateUser:', err);
    throw err;
  }
}

async function serchTGStat(tems){
  try{
    const response = await axios.get('https://api.tgstat.ru/channels/search',{
      params:{
        token: TGStat,
        q: tems,
        lang: 'ru'
      }})

      if (response.data.status === 'ok') {
        const channles = response.data.response.items
        console.log(channles)
        return channles
      } else {
        console.error('ошибка', response.data.error)
      }
    } catch (error){
      console.error('ошибка запроса', error.message)
      return []
    }
}


async function generateKeyboard(telegramId) {
  const user = await getOrCreateUser(telegramId);
  const buttons = [
      ...user.themes.map(theme => [{text: theme}]), 
      [
      {text: '🔙 Назад'}
    ]
  ];
  return { 
    reply_markup: { 
      keyboard: buttons, 
      resize_keyboard: true,
      one_time_keyboard: false
    } 
  };
}

const start_btn = {
  reply_markup: { 
    keyboard: [[
      {text: '📃Мои темы'},
      {text: '🔎Поиск постов'}
    ],
    [
      {text: '🛠️Настройка тем'} ,
      {text: '🛠️Настройка каналов'} ,
      {text: '❌Отключить уведомления'}
    ]], 
    resize_keyboard: true,
    one_time_keyboard: false
  } 
}
const stop_btn = {
  reply_markup: { 
    keyboard: [[
      {text: 'Стоп'}
    ]], 
    resize_keyboard: true,
    one_time_keyboard: false
  } 
}
const key_tems = {
  reply_markup: { 
    keyboard: [[
      {text: 'Добавить тему'} ,
      {text: 'Удалить тему'},
      {text: '🔙 Назад'}
    ]], 
    resize_keyboard: true,
    one_time_keyboard: false
  } 
}

const key_chanle = {
  reply_markup: { 
    keyboard: [[
      {text: 'Добавить канал'} ,
      {text: 'Удалить канал'},
      {text: 'Посмотреть каналы'},
      {text: '🔙 Назад'}
    ]], 
    resize_keyboard: true,
    one_time_keyboard: false
  } 
}



bot.onText(/\/start/, async (msg) => {
  try {
    await initializeUser(msg.from.id);
    const keyboard_tems = await generateKeyboard(msg.from.id);
    activeUsers.add(msg.from.id);
    
   await bot.sendMessage(
      msg.chat.id,
   `✨ <b>Привет, ${msg.from.first_name}!</b> 👋\n\n` +
    `Я - бот для отслеживания Telegram-каналов по интересующим вас темам.\n\n` +
    `📌 <b>Как это работает:</b>\n` +
    `1. <b>Выбираете темы</b> - например, криптовалюта, IT или наука\n` +
    `2. <b>Я анализирую</b> новые посты из добавленных вами каналов\n` +
    `3. <b>Присылаю уведомления</b>, когда нахожу посты по вашим темам\n\n` +
    `⚡ Все просто - вы получаете только то, что вам действительно интересно!`,
      {
        parse_mode: 'HTML'
      }
      
    )
    await bot.sendMessage(msg.chat.id, 'что можно сделать:', start_btn)
  } catch (err) {
    console.error('Ошибка в обработчике /start:', err);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});


export async function sendPostNotifications(postData) {
  try {
    const subscribedUsers = await UserTheme.find({
      themes: { $in: postData.tema },
      telegramId: { $exists: true }
    });

    for (const user of subscribedUsers) {
      if (!activeUsers.has(user.telegramId)) continue;
      
      try {
        const userMatchedThemes = user.themes
          .filter(theme => postData.tema.includes(theme))
          .join(", ");

        const messageText = `
📢 <b>Новый пост по теме: ${userMatchedThemes}</b>
<b>Канал:</b> ${postData.channel}
<b>Текст:</b> ${postData.text.substring(0, 100)}${postData.text.length > 100 ? '...' : ''}
        `.trim();

        await bot.sendMessage(
          user.telegramId,
          messageText,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🔗 Открыть пост", url: postData.ssilkaPost },
                  { text: "❌Отключить уведомления", callback_data: `disable_notif_${user.telegramId}` }
                ]
              ]
            }
          }
        );
      } catch (err) {
        console.error(`Ошибка отправки пользователю ${user.telegramId}:`, err);
        if (err.response?.statusCode === 403) {
          activeUsers.delete(user.telegramId);
        }
      }
    }
  } catch (err) {
    console.error('Ошибка при рассылке уведомлений:', err);
  }
}



bot.onText(/^Добавить тему$/, async (msg) => {
  userStates.set(msg.chat.id, { action: 'addingTheme' });
  await bot.sendMessage(
    msg.chat.id, 
    'Введите название новой темы (она должна быть с маленькой буквы, можно несколько слов):'
  );
});

function extractUsernameFromLink(link) {
  const regex = /t\.me\/([a-zA-Z0-9_]+)/i;
  const match = link.match(regex);
  return match ? match[1] : null;
}

bot.onText(/^Добавить канал$/, async (msg) => {
  userStates.set(msg.chat.id, { action: 'addingChanle' });
  await bot.sendMessage(
    msg.chat.id, 
    'Введите ссылку на канал посты которого будет мониторить бот (пример: t.me/mainranepa):'
  );
});

bot.onText(/^🔎Поиск постов$/, async (msg) => {
  userStates.set(msg.chat.id, { action: 'SerchPosts' });
  await bot.sendMessage(
    msg.chat.id, 
    `Введите ключевые слова для поиска постов (в каналах которые вы добавили в бота). Для остановки поиска нажмите "Стоп":`, 
    stop_btn
  );
});
bot.onText(/^Посмотреть каналы$/, async (msg) => {
  try {
    const user = await getOrCreateUser(msg.from.id);

  

    // Форматируем каналы в виде ссылок
    const formatChannelLinks = (channels) => {
      return channels.map((channel, index) => 
        `${index + 1}. <a href="https://t.me/${channel}">${channel}</a>`
      ).join('\n');
    };
    

    // Если у пользователя нет своих каналов
    if (!user.channles || user.channles.length === 0) {
      return await bot.sendMessage(
        msg.chat.id,
        `📌 <b>Каналы по умолчанию:</b>\n\n${formatChannelLinks(DEFAULT_CHANNELS)}`,
        {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: start_btn
        }
      );
    }

    // Если есть свои каналы
    await bot.sendMessage(
      msg.chat.id,
      `📌 <b>Каналы по умолчанию:</b>\n${formatChannelLinks(DEFAULT_CHANNELS)}\n\n` +
      `📌 <b>Ваши каналы:</b>\n${formatChannelLinks(user.channles)}`,
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: start_btn
      }
    );
  } catch (error) {
    console.error('Ошибка при обработке команды "Посмотреть каналы":', error);
    await bot.sendMessage(
      msg.chat.id,
      'Произошла ошибка при получении ваших каналов. Пожалуйста, попробуйте позже.'
    );
  }
});
bot.onText(/^Отключить уведомления$/, async (msg) => {
  activeUsers.delete(msg.from.id);
  await bot.sendMessage(
    msg.chat.id, 
    'Уведомления отключены. Используйте /start для повторного включения.'
  );
});

// Основной обработчик сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const userId = msg.from.id;

  if (!text || text.startsWith('/')) return;

  const userState = userStates.get(chatId);
  const user = await getOrCreateUser(userId);
  
  if(text == '🛠️Настройка тем'){
    await bot.sendMessage(chatId, `настройка тем:`, key_tems);
  }
  if(text == '🛠️Настройка каналов'){
    await bot.sendMessage(chatId, `настройка каналов:`, key_chanle);
  }
  if(text == '📃Мои темы'){
    const keyboard_tems = await generateKeyboard(msg.from.id);
    await bot.sendMessage(chatId, `Ваши темы:`, keyboard_tems);
  }
  if(text == '🔙 Назад'){
    await bot.sendMessage(msg.chat.id, 'что можно сделать:',start_btn)
  }
  if (userState?.action === 'SerchPosts') {
    userStates.delete(chatId);
  
    // Обработка команды "Стоп" до начала поиска
    if (text === 'Стоп') {
        activeSearches.set(chatId, { isActive: false });
        return await bot.sendMessage(chatId, 'Поиск не был начат', start_btn);
    }
  
    if (text.length < 2) {
        return bot.sendMessage(chatId, 'Запрос должен содержать минимум 2 символа');
    }
    
    try {
        const user = await getOrCreateUser(msg.from.id);
        

        const channelsList = [...new Set([...DEFAULT_CHANNELS, ...user.channles])];
        // Инициализация поиска
        activeSearches.set(chatId, { 
            isActive: true,
            startTime: new Date(),
            keyword: text
        });
        
        // Отправка информации о начале поиска
        await bot.sendMessage(
            chatId,
            `🔍 Начинаю поиск по запросу: "${text}"\n` +
            `📌 Каналов для поиска: ${channelsList.length}\n` +
            `Для остановки нажмите "Стоп"`,
            stop_btn
        );
        
        // Поиск с обработкой прерывания
        const results = await searchMessages(channelsList, text, {
            limit: 10, // Ограничиваем количество сообщений для быстрого ответа
            withMetadata: true
        });
        
        let totalFound = 0;
        let channelsWithResults = 0;
        
        for (const { channel, messages } of results) {
            // Проверка флага остановки
            if (!activeSearches.get(chatId)?.isActive) break;
            
            if (messages.length > 0) {
                channelsWithResults++;
                totalFound += messages.length;
                
                try {
                    // Отправка сводки по каналу
                    await bot.sendMessage(
                        chatId,
                        `📢 <b>${channel}</b>\n` +
                        `Найдено сообщений: ${messages.length}\n` +
                        `Последнее: ${new Date(messages[0].date* 1000).toLocaleString('ru-RU')}`,
                        { parse_mode: 'HTML' }
                    );
                    
                    // Отправка сообщений с пагинацией
                    for (const [index, msg] of messages.entries()) {
                        if (!activeSearches.get(chatId)?.isActive) break;
                        
                        const messageText = `💬 <b>Сообщение</b> \n` +
                                           `📅 ${new Date(msg.date * 1000).toLocaleString('ru-RU')}\n` +
                                           `🔗 <a href="${msg.url}">Перейти к сообщению</a>\n\n` +
                                           `${msg.text.substring(0, 300)}${msg.text.length > 300 ? '...' : ''}`;
                        
                        await bot.sendMessage(
                            chatId,
                            messageText,
                            {
                                parse_mode: 'HTML',
                                disable_web_page_preview: true,
                                reply_markup: index === messages.length - 1 ? stop_btn : undefined
                            }
                        );
                        
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (channelError) {
                    console.error(`Ошибка обработки канала ${channel}:`, channelError);
                }
            }
        }
        
        // Формирование итогового сообщения
        let summaryMessage;
        if (!activeSearches.get(chatId)?.isActive) {
            summaryMessage = `🛑 Поиск остановлен\n` +
                             `Найдено: ${totalFound} сообщений в ${channelsWithResults} каналах`;
        } else {
            summaryMessage = `✅ Поиск завершен\n` +
                            `Всего найдено: ${totalFound} сообщений в ${channelsWithResults} каналах\n` +
                            `По запросу: "${text}"`;
        }
        
        await bot.sendMessage(chatId, summaryMessage, start_btn);
        
    } catch (error) {
        console.error('Ошибка поиска:', error);
        await bot.sendMessage(
            chatId,
            '⚠️ Произошла ошибка при поиске сообщений',
            start_btn
        );
    } finally {
        activeSearches.delete(chatId);
    }
    return;
}
  if (userState?.action === 'addingTheme') {
    userStates.delete(chatId);
  
    if (text.length < 2) {
      return bot.sendMessage(chatId, 'Название темы должно содержать минимум 2 символа');
    }
  
    if (user.themes.includes(text)) {
      return bot.sendMessage(chatId, 'Такая тема уже существует!');
    }
  
    try {
      await user.addTheme(text);
      const channels = await searchChannel(text);
  
      if (channels.length === 0) {

        await bot.sendMessage(chatId, `✅ Тема "${text}" добавлена, но каналов не найдено`, start_btn);
        return;
      }
  
      await bot.sendMessage(chatId, `🔍 Результаты поиска по "${text}":\n\n`);
      
      // Отправка найденных каналов
      for (const channel of channels) {
        const link = channel.username 
          ? `https://t.me/${channel.username}`
          : `ID: ${channel.id}`;
        
        await bot.sendMessage(
          chatId,
          `📢 <b>${channel.title}</b>\n🔗 ${link}`,
          { parse_mode: 'HTML' }
        );
      }
  
      await bot.sendMessage(chatId, `✅ Тема "${text}" успешно добавлена!`, start_btn);
    } catch (err) {
      console.error('Ошибка добавления темы:', err);
      await bot.sendMessage(chatId, '❌ Произошла ошибка при добавлении темы');
    }
    return;
  }

  if (userState?.action === 'addingChanle') {
    userStates.delete(chatId);
    const username = extractUsernameFromLink(text);

    if (username.length < 2) {
      return bot.sendMessage(chatId, 'Название канала должно содержать минимум 2 символа');
    }

    if (user.channles.includes(username)) {
      return bot.sendMessage(chatId, 'Такой канал уже есть!');
    }

    try {
      await user.addChannl(username);
      await client.invoke(new Api.channels.JoinChannel({
        channel: username
      }));
      await startMonitoring()
      await bot.sendMessage(chatId, `✅ Канал "${username}" успешно добавлена!`, start_btn);
    } catch (err) {
      console.error('Ошибка добавления канала:', err);
      await bot.sendMessage(chatId, '❌ Произошла ошибка при добавлении канала');
    }
    return;
  }

  if (user.themes.includes(text)) {
    try {
      const user = await getOrCreateUser(userId);

      userPostPagination.set(userId, {
        theme: text,
        offset: 0
      });

      const posts = await PostModels.post_news.find({ 
        tema: text,  
        channelUsername: { $in: user.channles } 
      })
      .sort({ date: -1 }) // Сначала новые
      .skip(0)
      .limit(5);
      
      if (!posts.length) {
        return bot.sendMessage(chatId, `По теме "${text}" пока нет сохранённых постов.`);
      }
      const reversedPosts = [...posts].reverse();

      for (const post of reversedPosts) {
        const postThemes = post.tema.join(", ");
        const postMessage = `
<b>Темы:</b> ${postThemes}
<b>Канал:</b> ${post.channel}
<b>Текст:</b> ${post.text}
<b>Дата:</b> ${post.date.toLocaleString()}
        `.trim();

        await bot.sendMessage(
          chatId,
          postMessage,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[{ text: "🔗 Открыть пост", url: post.ssilkaPost }]]
            }
          }
        );
      }
    } catch (err) {
      console.error('Ошибка поиска постов:', err);
      await bot.sendMessage(chatId, '❌ Произошла ошибка при поиске постов');
    }
  }
});


bot.onText(/^Удалить тему$/, async (msg) => {
  try {
    const user = await getOrCreateUser(msg.from.id);
    
    if (user.themes.length === 0) {
      return bot.sendMessage(msg.chat.id, 'У вас нет тем для удаления');
    }
    
    const keyboard_tems = {
      reply_markup: {
        keyboard: user.themes.map(themss => [{text: `Удалить тему ${themss}`}]),
        resize_keyboard: true
      }
    };
    
    await bot.sendMessage(msg.chat.id, 'Выберите тему для удаления:', keyboard_tems);
  } catch (err) {
    console.error('Ошибка в обработчике удаления темы:', err);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке запроса');
  }
});



bot.onText(/^Удалить тему (.+)$/, async (msg, match) => {
  try {
    const themesName = match[1].replace('Удалить тему ', '').trim();
    const user = await getOrCreateUser(msg.from.id);
    
    if (!user.themes.includes(themesName)) {
      return bot.sendMessage(msg.chat.id, 'Такой темы нет');
    }
    
    await user.removeTheme(themesName);
    const keyboard_tems = await generateKeyboard(msg.from.id);
    await bot.sendMessage(msg.chat.id, `Тема "${themesName}" удалена!`, start_btn);
  } catch (err) {
    console.error('Ошибка при удалении темы:', err);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при удалении темы');
  }
});

bot.onText(/^Удалить канал$/, async (msg) => {
  try {
    const user = await getOrCreateUser(msg.from.id);
    
    if (user.channles.length === 0) {
      return bot.sendMessage(msg.chat.id, 'У вас нет каналов для удаления');
    }
    
    const keyboard_tems = {
      reply_markup: {
        keyboard: user.channles.map(channel => [{text: `Удалить канал ${channel}`}]),
        resize_keyboard: true
      }
    };
    
    await bot.sendMessage(msg.chat.id, 'Выберите канал для удаления:', keyboard_tems);
  } catch (err) {
    console.error('Ошибка в обработчике удаления каналов:', err);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке запроса');
  }
});

bot.onText(/^Удалить канал (.+)$/, async (msg, match) => {
  try {
    const channelName = match[1].replace('Удалить канал ', '').trim();
    const user = await getOrCreateUser(msg.from.id);
    
    if (!user.channles.includes(channelName)) {
      return bot.sendMessage(msg.chat.id, 'Такого канала нет в вашем списке');
    }
    
    await user.removeChannl(channelName);
    await startMonitoring()
    await bot.sendMessage(msg.chat.id, `Канал "${channelName}" удален!`, start_btn);
    
    // Обновляем мониторинг после удаления канала
    await startMonitoring();
  } catch (err) {
    console.error('Ошибка при удалении канала:', err);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при удалении канала');
  }
});

bot.onText(/^Стоп$/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (activeSearches.has(chatId)) {
    activeSearches.set(chatId, { isActive: false });
    await bot.sendMessage(chatId, '🛑 Получена команда остановки...', start_btn);
  }
});


bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;

  if (data.startsWith('disable_notif')) {
    const userId = data.split('_')[2] || msg.chat.id;
    activeUsers.delete(Number(userId));
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Уведомления отключены' });
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: msg.chat.id, message_id: msg.message_id }
    );
  }
});


bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});


process.on('SIGINT', async () => {
  console.log('Остановка бота...');
  await mongoose.disconnect();
  bot.stopPolling();
  process.exit();
}); 