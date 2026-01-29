import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMAXBridge } from '../useMAXBridge.js';
import apiService from '../api-service.js';

/**
 * Hub page: feed (cold_news), stories placeholder, events widgets.
 */
const HubPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const [headerColor] = useState(
    () => document.documentElement.style.getPropertyValue('--max-primary') || '#0088CC'
  );
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedOffset, setFeedOffset] = useState(0);
  const feedLimit = 20;

  const currentUser = userInfo || user;
  const userAvatar =
    currentUser?.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      (currentUser?.first_name || 'User') + ' ' + (currentUser?.last_name || '')
    )}&background=0088CC&color=fff`;

  useEffect(() => {
    const loadSources = async () => {
      try {
        const data = await apiService.getHubSources();
        setSources(data.sources || []);
      } catch (e) {
        console.warn('Hub sources load failed', e);
      }
    };
    loadSources();
  }, []);

  useEffect(() => {
    const loadFeed = async () => {
      setFeedLoading(true);
      try {
        const params = { limit: feedLimit, offset: feedOffset };
        if (selectedSource) params.channel = selectedSource;
        const data = await apiService.getHubFeed(params);
        setFeedPosts(data.posts || []);
        setFeedTotal(data.total ?? 0);
      } catch (e) {
        console.warn('Hub feed load failed', e);
        setFeedPosts([]);
        setFeedTotal(0);
      } finally {
        setFeedLoading(false);
      }
    };
    loadFeed();
  }, [selectedSource, feedOffset]);

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const formatPostDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('ru-RU', { weekday: 'short' });
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="hub-page">
      <header className="main-header hub-header" style={{ background: headerColor || '#0088CC' }}>
        <div className="header-top hub-header-top">
          <div className="hub-header-left">
            <div role="button" tabIndex={0} className="hub-profile-avatar" onClick={handleProfileClick} onKeyDown={(e) => e.key === 'Enter' && handleProfileClick()} aria-label="Профиль">
              <img src={userAvatar} alt="Профиль" />
            </div>
          </div>
          <div className="hub-header-center">
            <h1 className="hub-title">MAX</h1>
          </div>
          <div className="hub-header-right">
            <button type="button" className="hub-search-btn" aria-label="Поиск">
              🔍
            </button>
          </div>
        </div>
      </header>

      <main className="hub-content">
        {/* Stories placeholder */}
        <section className="hub-stories">
          <h2 className="hub-section-label">Сторисы</h2>
          <div className="hub-stories-track">
            <div className="hub-story-item hub-story-add">+</div>
            <div className="hub-story-item hub-story-placeholder" />
            <div className="hub-story-item hub-story-placeholder" />
            <div className="hub-story-item hub-story-placeholder" />
          </div>
        </section>

        {/* Feed from cold_news */}
        <section className="hub-feed">
          <div className="hub-feed-header">
            <h2 className="hub-section-label">Лента</h2>
            {sources.length > 0 && (
              <select
                className="hub-feed-source-select"
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setFeedOffset(0);
                }}
                aria-label="Источник"
              >
                <option value="">Все источники</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
          <div className="hub-feed-list">
            {feedLoading ? (
              <div className="hub-feed-loading">Загрузка...</div>
            ) : feedPosts.length > 0 ? (
              <ul className="hub-feed-posts">
                {feedPosts.map((post) => (
                  <li key={post.id} className="feed-post-card">
                    <div className="feed-post-header">
                      <span className="feed-post-source">{post.channelUsername || post.channel || 'Канал'}</span>
                      <span className="feed-post-date">{formatPostDate(post.date)}</span>
                    </div>
                    <div className="feed-post-text">{post.text}</div>
                    {(post.tema?.length > 0 || post.link) && (
                      <div className="feed-post-footer">
                        {post.tema?.length > 0 && (
                          <div className="feed-post-tags">
                            {post.tema.slice(0, 3).map((t) => (
                              <span key={t} className="feed-post-tag">{t}</span>
                            ))}
                          </div>
                        )}
                        {post.link && (
                          <a
                            href={post.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="feed-post-link"
                          >
                            Открыть пост
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="hub-feed-empty">
                <p>Лента постов по чатам и источникам будет здесь.</p>
                <p className="hub-feed-hint">Запустите сервис cold_news (npm run feed-api) для загрузки постов.</p>
              </div>
            )}
          </div>
        </section>

        {/* Events block: widget + link to bot */}
        <section className="hub-events">
          <h2 className="hub-section-label">Мероприятия</h2>
          <div className="hub-events-widget">
            <p>Информация о мероприятиях и регистрация — в боте.</p>
            <a
              href="https://t.me/events_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hub-events-bot-link"
            >
              Открыть в боте
            </a>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HubPage;
