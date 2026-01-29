import TelegramBot from 'node-telegram-bot-api'
import { TelegramClient } from "telegram";
import { StringSession } from 'telegram/sessions/index.js';
import axios from 'axios';
import https from "https"
import qs from "qs"
import { v4 as uuidv4 } from 'uuid';

const TOKEN = ''
const bot = new TelegramBot(TOKEN, {polling: true});
const SAVED_SESSION = '';
const apiId = '';
const apiHash = '';

const channelsToMonitor = [
    "gspmranepa",
    "Emit_ranepa",
    "pers_conf", 
];

const GIGACHAT_AUTH_URL = '';
const GIGACHAT_API_URL = '';
const CLIENT_ID = '';
const CLIENT_SECRET = '';

const agent = new https.Agent({  
    rejectUnauthorized: false
});

let gigaChatToken = null;
let tokenExpiration = 0;

async function getGigaChatToken() {
    if (gigaChatToken && Date.now() < tokenExpiration) {
        return gigaChatToken;
    }

    try {
        const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const response = await axios.post(
            GIGACHAT_AUTH_URL,
            qs.stringify({ scope: 'GIGACHAT_API_B2B' }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'RqUID': uuidv4(),
                    'Authorization': `Basic ${authString}`
                },
                httpsAgent: agent
            }
        );
        
        gigaChatToken = response.data.access_token;
        tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000;
        return gigaChatToken;
    } catch (error) {
        console.error('⚠️ Ошибка получения токена:', error.response?.data || error.message);
        throw error;
    }
}

async function filterPostsByTopic(posts, topic) {
    try {
        const token = await getGigaChatToken();
        const prompt = `
Требуется отфильтровать посты по теме «${topic}». 
Верни JSON-объект с единственным полем "posts" - массивом текстов подходящих постов.
Пример: {"posts": ["текст поста 1", "текст поста 2"]}

Посты для анализа (максимум 500 символов каждый):
${JSON.stringify(posts.map(p => p.text.substring(0, 500)))}
`;

        const response = await axios.post(
            GIGACHAT_API_URL,
            {
                model: "GigaChat-Pro",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
                response_format: { type: "json_object" }
            },
            {
                headers: { "Authorization": `Bearer ${token}` },
                httpsAgent: agent,
                timeout: 15000 // Увеличил таймаут
            }
        );

        const responseText = response.data.choices[0].message.content
            .replace(/```(json)?|```/g, '')
            .trim();
        
        const { posts: relevantTexts = [] } = JSON.parse(responseText) || {};
        console.log(posts)
        // Более надежное сравнение - по начальным N символам
        return posts.filter(post => 
            relevantTexts.some(text => 
                post.text.substring(0, 200) === text.substring(0, 200) ||
                post.text.includes(text) ||
                text.includes(post.text.substring(0, 200))
            )
        ).map(post => ({
            text: post.text,
            channel: post.channel,
            url: post.url
        }));

    } catch (error) {
        console.error("Ошибка фильтрации:", error.message);
        return [];
    }
}

const client = new TelegramClient(new StringSession(SAVED_SESSION), apiId, apiHash, {
    connectionRetries: 5,
});

(async () => {
    await client.connect();
    console.log('✅ Авторизован через сессию');

    bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, "Привет! Отправь мне тему, и я найду посты из каналов.");
    });

    bot.on("message", async (msg) => {
        if (msg.text.startsWith("/")) return;

        const topic = msg.text;
        const chatId = msg.chat.id;

        try {
            bot.sendMessage(chatId, `🔍 Ищу посты по теме «${topic}»...`);

            let allPosts = [];
            for (const channelUsername of channelsToMonitor) {
                try {
                    const channel = await client.getEntity(channelUsername);
                    const messages = await client.getMessages(channel, { limit: 50 });
                    
                    const channelPosts = messages.filter(msg => msg.text).map(msg => ({
                        text: msg.text,
                        date: msg.date,
                        id: msg.id,
                        channel: channelUsername,
                        url: `https://t.me/${channelUsername}/${msg.id}`
                    }));
                    
                    allPosts.push(...channelPosts);
                } catch (error) {
                    console.error(`Ошибка в канале ${channelUsername}:`, error.message);
                }
            }

            const relevantPosts = await filterPostsByTopic(allPosts, topic);
            console.log(relevantPosts)

            if (relevantPosts.length === 0) {
                await bot.sendMessage(chatId, "По заданной теме ничего не найдено.");
            } else {
                let response = `📌 Найдено ${relevantPosts.length} постов:\n\n`;
                relevantPosts.slice(0, 10).forEach((post, index) => {
                    response += `${index + 1}. <b>${post.channel}</b>\n`;
                    response += `${post.text.slice(0, 200)}...\n`;
                    response += `<a href="${post.url}">Читать полностью</a>\n\n`;
                });
                await bot.sendMessage(chatId, response, { parse_mode: "HTML" });
            }

        } catch (error) {
            console.error("Общая ошибка:", error);
            await bot.sendMessage(chatId, "⚠️ Произошла ошибка при обработке запроса.");
        }
    });
})();