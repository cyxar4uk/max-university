import React from 'react';
import { useSelector } from 'react-redux';
import { useMAXBridge } from '../useMAXBridge.js';

/**
 * Hub page: feed (cold_news), stories placeholder, events widgets.
 * Will be extended with feed API and events API.
 */
const HubPage = () => {
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const [headerColor] = React.useState(
    () => document.documentElement.style.getPropertyValue('--max-primary') || '#0088CC'
  );
  const currentUser = userInfo || user;
  const userAvatar =
    currentUser?.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      (currentUser?.first_name || 'User') + ' ' + (currentUser?.last_name || '')
    )}&background=0088CC&color=fff`;

  return (
    <div className="hub-page">
      <header className="main-header hub-header" style={{ background: headerColor || '#0088CC' }}>
        <div className="header-top hub-header-top">
          <div className="hub-header-left">
            <div className="hub-profile-avatar">
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

        {/* Feed placeholder - will load from cold_news API */}
        <section className="hub-feed">
          <h2 className="hub-section-label">Лента</h2>
          <div className="hub-feed-list">
            <div className="hub-feed-empty">
              <p>Лента постов по чатам и источникам будет здесь.</p>
              <p className="hub-feed-hint">Подключите сервис cold_news для загрузки постов.</p>
            </div>
          </div>
        </section>

        {/* Events block placeholder - will use events API */}
        <section className="hub-events">
          <h2 className="hub-section-label">Мероприятия</h2>
          <div className="hub-events-widget">
            <p>Информация о мероприятиях и ссылка на бота.</p>
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
