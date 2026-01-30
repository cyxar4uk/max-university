import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMAXBridge } from '../useMAXBridge.js';
import apiService from '../api-service.js';
import { getAvatarUrl } from '../utils/avatarUrl.js';
import ScheduleWidget from '../Widgets/ScheduleWidget.jsx';
import DigitalPassWidget from '../Widgets/DigitalPassWidget.jsx';

const EVENTS_BOT_LINK = 'https://t.me/event_ranepa_bot';

/**
 * Главная: хедер (аватар, поиск), виджеты (расписание + QR + мероприятия),
 * карусель сторис, лента постов до бесконечности, футер в MainLayout.
 */
const MainPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const [headerColor, setHeaderColor] = useState('#0088CC');
  const [showDigitalPass, setShowDigitalPass] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedOffset, setFeedOffset] = useState(0);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const feedLimit = 20;

  const currentUser = userInfo || {
    first_name: user.firstName,
    last_name: user.lastName,
    photo_url: user.photoUrl,
    avatar_url: user.avatarUrl,
    photo: user.photo,
  };
  const userAvatar = getAvatarUrl(currentUser, headerColor);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');
        const config = await apiService.getBlocksConfig(universityId, user.role || 'student');
        if (config?.header_color) {
          setHeaderColor(config.header_color);
          document.documentElement.style.setProperty('--max-primary', config.header_color);
        }
      } catch (_) {}
    };
    loadConfig();
  }, [user.universityId, user.role]);

  const loadFeed = useCallback(async (append = false) => {
    setFeedLoading(true);
    try {
      const offset = append ? feedOffset : 0;
      const data = await apiService.getHubFeed({ limit: feedLimit, offset });
      const posts = data.posts || [];
      const total = data.total ?? 0;
      if (append) {
        setFeedPosts((prev) => [...prev, ...posts]);
      } else {
        setFeedPosts(posts);
      }
      setFeedOffset(offset + posts.length);
      setFeedTotal(total);
      setFeedHasMore(offset + posts.length < total);
    } catch (_) {
      if (!append) setFeedPosts([]);
      setFeedHasMore(false);
    } finally {
      setFeedLoading(false);
    }
  }, [feedOffset]);

  useEffect(() => {
    loadFeed(false);
  }, []);

  const loadMore = useCallback(() => {
    if (feedHasMore && !feedLoading) loadFeed(true);
  }, [feedHasMore, feedLoading, loadFeed]);

  const handleProfileClick = () => navigate('/profile');
  const formatPostDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('ru-RU', { weekday: 'short' });
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const filteredPosts = searchQuery.trim()
    ? feedPosts.filter(
        (p) =>
          (p.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.channelUsername || p.channel || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : feedPosts;

  return (
    <div className="main-page">
      <header className="main-header main-page-header" style={{ background: headerColor }}>
        <div className="main-page-header-inner">
          <button
            type="button"
            className="main-page-avatar"
            onClick={handleProfileClick}
            aria-label="Профиль"
          >
            <img src={userAvatar} alt="" />
          </button>
          <div className="main-page-header-center" />
          <button
            type="button"
            className="main-page-search-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Поиск"
          >
            🔍
          </button>
        </div>
      </header>

      <main className="main-page-content">
        {/* Виджеты: расписание + столбик из двух кнопок (QR, мероприятия) */}
        <section className="main-page-widgets">
          <div className="main-page-widget-schedule">
            <ScheduleWidget block={{ block_type: 'schedule', name: 'Расписание' }} apiService={apiService} />
          </div>
          <div className="main-page-widget-buttons">
            <button
              type="button"
              className="main-page-widget-btn main-page-widget-qr"
              onClick={() => setShowDigitalPass(true)}
              aria-label="QR-код"
            >
              <span className="main-page-widget-btn-icon">📱</span>
              <span className="main-page-widget-btn-label">QR-код</span>
            </button>
            <a
              href={EVENTS_BOT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="main-page-widget-btn main-page-widget-events"
              aria-label="Мероприятия"
            >
              <span className="main-page-widget-btn-icon">🎉</span>
              <span className="main-page-widget-btn-label">Мероприятия</span>
            </a>
          </div>
        </section>

        {/* Карусель сторис (заглушка: при открытии — плейер-заглушка) */}
        <section className="main-page-stories">
          <div className="main-page-stories-track">
            <div className="main-page-story main-page-story-add">+</div>
            <div className="main-page-story main-page-story-placeholder" />
            <div className="main-page-story main-page-story-placeholder" />
            <div className="main-page-story main-page-story-placeholder" />
          </div>
        </section>

        {/* Лента постов */}
        <section className="main-page-feed">
          <h2 className="main-page-feed-title">Лента</h2>
          <div className="main-page-feed-list">
            {filteredPosts.length > 0 ? (
              <ul className="main-page-feed-posts">
                {filteredPosts.map((post) => (
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
                          <a href={post.link} target="_blank" rel="noopener noreferrer" className="feed-post-link">
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
            {feedHasMore && filteredPosts.length > 0 && (
              <button
                type="button"
                className="main-page-feed-more"
                onClick={loadMore}
                disabled={feedLoading}
              >
                {feedLoading ? 'Загрузка…' : 'Ещё'}
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Поиск (рабочий: фильтр по ленте) */}
      {searchOpen && (
        <div className="main-page-search-overlay" role="dialog" aria-label="Поиск">
          <div className="main-page-search-box">
            <input
              type="search"
              className="main-page-search-input"
              placeholder="Поиск по ленте…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="main-page-search-close"
              onClick={() => setSearchOpen(false)}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
          <div className="main-page-search-backdrop" onClick={() => setSearchOpen(false)} />
        </div>
      )}

      {/* Цифровой пропуск (QR) */}
      {showDigitalPass && (
        <div className="modal-overlay" onClick={() => setShowDigitalPass(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowDigitalPass(false)}>
              ×
            </button>
            <DigitalPassWidget />
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
