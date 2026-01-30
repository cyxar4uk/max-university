import React, { useEffect, useState } from 'react';
import apiService from '../api-service.js';

/**
 * Виджет мероприятий: карточка ближайшего события по макету или пустое состояние.
 * showCardLayout — одна большая карточка (фото, название, дата, место, кнопка «Записаться»).
 * showEmptyState — при отсутствии мероприятий показывать явное сообщение.
 */
const HubEventsWidget = ({ limit = 5, compact = false, showCardLayout = false, showEmptyState = false }) => {
  const [data, setData] = useState({ events: [], bot_link: 'https://t.me/event_ranepa_bot' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiService.getExternalEvents(limit);
        setData({
          events: res.events || [],
          bot_link: res.bot_link || 'https://t.me/event_ranepa_bot',
        });
      } catch (e) {
        setData({ events: [], bot_link: 'https://t.me/event_ranepa_bot' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [limit]);

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateRange = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="hub-events-widget hub-events-widget-loading">
        <p>Загрузка мероприятий...</p>
      </div>
    );
  }

  const hasEvents = data.events.length > 0;
  const firstEvent = hasEvents ? data.events[0] : null;

  if (showCardLayout && hasEvents && firstEvent) {
    const registerLink = firstEvent.bot_link || data.bot_link;
    return (
      <div className="hub-events-widget hub-events-widget--card-layout">
        <a
          href={registerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="hub-event-hero-card"
        >
          <div className="hub-event-hero-image" />
          <div className="hub-event-hero-content">
            <h3 className="hub-event-hero-title">{firstEvent.title || firstEvent.name}</h3>
            <div className="hub-event-hero-meta">
              <span className="hub-event-hero-meta-item">
                <span className="hub-event-hero-meta-icon" aria-hidden>📅</span>
                {formatDateRange(firstEvent.date)}
              </span>
              {(firstEvent.location || firstEvent.place) && (
                <span className="hub-event-hero-meta-item">
                  <span className="hub-event-hero-meta-icon" aria-hidden>📍</span>
                  {(firstEvent.location || firstEvent.place).toUpperCase()}
                </span>
              )}
            </div>
            <div className="hub-event-hero-actions">
              <span className="hub-event-hero-btn">Записаться</span>
              <span className="hub-event-hero-info" aria-hidden>i</span>
            </div>
          </div>
        </a>
        <a href={data.bot_link} target="_blank" rel="noopener noreferrer" className="hub-events-bot-link">
          Открыть в боте
        </a>
      </div>
    );
  }

  if (showCardLayout && showEmptyState && !hasEvents) {
    return (
      <div className="hub-events-widget hub-events-widget--empty">
        <div className="hub-events-empty-state">
          <p className="hub-events-empty-title">Пока нет мероприятий</p>
          <p className="hub-events-empty-hint">
            Мероприятия и регистрация — в боте. Когда события будут подключены, они появятся здесь.
          </p>
          <a href={data.bot_link} target="_blank" rel="noopener noreferrer" className="hub-events-bot-link">
            Открыть в боте
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`hub-events-widget ${compact ? 'hub-events-widget-compact' : ''}`}>
      {hasEvents ? (
        <ul className="hub-events-list">
          {data.events.map((ev) => (
            <li key={ev.id || ev.title} className="hub-event-card">
              <div className="hub-event-title">{ev.title || ev.name}</div>
              {ev.date && <div className="hub-event-date">{formatDate(ev.date)}</div>}
              {ev.registration_status && (
                <span className="hub-event-status">{ev.registration_status}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hub-events-placeholder">Мероприятия и регистрация — в боте.</p>
      )}
      <a href={data.bot_link} target="_blank" rel="noopener noreferrer" className="hub-events-bot-link">
        Открыть в боте
      </a>
    </div>
  );
};

export default HubEventsWidget;
