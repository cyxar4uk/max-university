/**
 * REST API for MAX Hub feed.
 * Serves GET /api/feed and GET /api/sources from cold_news MongoDB.
 * Run: node feed-api.js (uses same MONGOdb env as main bot).
 */
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { DEFAULT_CHANNELS } from './channels.config.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGOdb || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.warn('MONGOdb not set; feed API will return empty data.');
}

const NewsPostSchema = new mongoose.Schema({
  text: String,
  date: { type: Date, default: Date.now },
  channel: String,
  channelUsername: String,
  channelId: String,
  ssilkaPost: String,
  tema: { type: [String], default: [] },
  tags: [String],
}, { collection: 'news_posts' });

const NewsPost = mongoose.models.newsPost || mongoose.model('newsPost', NewsPostSchema, 'news_posts');

async function connectDb() {
  if (!MONGO_URI) return;
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Feed API: MongoDB connected');
  } catch (err) {
    console.error('Feed API: MongoDB connection error', err);
  }
}

app.get('/api/feed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const channel = req.query.channel ? String(req.query.channel).trim() : null;
    const user_id = req.query.user_id; // optional: for future per-user sources

    if (!mongoose.connection.readyState) {
      return res.json({ posts: [], total: 0 });
    }

    const filter = {};
    if (channel) {
      filter.$or = [
        { channelUsername: new RegExp(channel, 'i') },
        { channel: new RegExp(channel, 'i') },
      ];
    }

    const [posts, total] = await Promise.all([
      NewsPost.find(filter)
        .sort({ date: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      NewsPost.countDocuments(filter),
    ]);

    const normalized = posts.map((p) => ({
      id: p._id?.toString(),
      text: p.text,
      date: p.date,
      channel: p.channel,
      channelUsername: p.channelUsername,
      channelId: p.channelId,
      link: p.ssilkaPost,
      tema: p.tema || [],
      tags: p.tags || [],
    }));

    res.json({ posts: normalized, total });
  } catch (err) {
    console.error('GET /api/feed error', err);
    res.status(500).json({ error: 'Feed error', posts: [] });
  }
});

app.get('/api/sources', async (_req, res) => {
  try {
    if (!mongoose.connection.readyState) {
      return res.json({ sources: DEFAULT_CHANNELS });
    }
    const channels = await NewsPost.distinct('channelUsername');
    const list = (channels && channels.length) ? channels : DEFAULT_CHANNELS;
    res.json({ sources: list });
  } catch (err) {
    console.error('GET /api/sources error', err);
    res.json({ sources: DEFAULT_CHANNELS });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cold-news-feed-api' });
});

const PORT = parseInt(process.env.FEED_API_PORT, 10) || 3001;

async function start() {
  await connectDb();
  app.listen(PORT, () => {
    console.log(`Feed API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Feed API start error', err);
  process.exit(1);
});
