import React, { useEffect, useState } from 'react';
import apiService from '../api-service.js';

/**
 * Widget for events from external API (ивенты). Shows cards and "Открыть в боте" link.
 * Used on Hub and optionally on Main (Главная).
 */
const HubEventsWidget = ({ limit = 5, compact = false }) => {
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

  if (loading) {
    return (
      <div className="hub-events-widget hub-events-widget-loading">
        <p>Загрузка мероприятий...</p>
      </div>
    );
  }

  return (
    <div className={`hub-events-widget ${compact ? 'hub-events-widget-compact' : ''}`}>
      {data.events.length > 0 ? (
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
      <a
        href={data.bot_link}
        target="_blank"
        rel="noopener noreferrer"
        className="hub-events-bot-link"
      >
        Открыть в боте
      </a>
    </div>
  );
};

export default HubEventsWidget;
