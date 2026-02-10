import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service.js';
import UserSwitcher from '../UserSwitcher.jsx';

const EventsPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [externalEvents, setExternalEvents] = useState([]);
  const [useExternal, setUseExternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailEvent, setDetailEvent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const external = await apiService.getExternalEvents(20);
        const list = external.events || [];
        if (list.length > 0) {
          setExternalEvents(list);
          setUseExternal(true);
          setEvents([]);
        } else {
          const data = await apiService.getEvents();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Error loading events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const handleRegister = async (eventId) => {
    try {
      await apiService.registerForEvent(eventId);
      alert('✅ Вы успешно зарегистрированы на событие!');
    } catch (error) {
      console.error('Error registering for event:', error);
      alert('❌ Ошибка при регистрации');
    }
  };

  const openExternalDetail = async (event) => {
    setDetailEvent(null);
    setDetailLoading(true);
    try {
      const d = await apiService.getExternalEventDetail(event.id);
      setDetailEvent(d);
    } catch (e) {
      setDetailEvent({ error: true, name: event.name || event.title });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailEvent(null);
  };

  const renderExternalList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {externalEvents.map((event) => {
        const title = event.name || event.title || 'Мероприятие';
        const dateStr = event.date ? new Date(event.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        const dateEndStr = event.date_end ? new Date(event.date_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        return (
          <div key={event.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
            {event.banner_url && (
              <div style={{ height: '160px', background: `url(${event.banner_url}) center/cover` }} />
            )}
            <div style={{ padding: '16px' }}>
              <h3 className="card-title">{title}</h3>
              {(dateStr || dateEndStr) && (
                <p className="card-text">📅 {dateStr}{dateEndStr && dateEndStr !== dateStr ? ` – ${dateEndStr}` : ''}</p>
              )}
              {event.location && <p className="card-text">📍 {event.location}</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {event.bot_link && (
                  <a href={event.bot_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    Записаться
                  </a>
                )}
                <button type="button" className="btn" onClick={() => openExternalDetail(event)}>
                  Подробнее
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderInternalList = () => (
    <div>
      {events.map((event) => (
        <div key={event.id} className="card">
          <h3 className="card-title">{event.title}</h3>
          <p className="card-text">📅 {event.date} в {event.time}</p>
          <p className="card-text">📍 {event.location}</p>
          <p className="card-text">👥 Участников: {event.participants}</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '12px' }}
            onClick={() => handleRegister(event.id)}
          >
            Зарегистрироваться
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            marginRight: '12px'
          }}
        >
          ←
        </button>
        <h1 className="page-title">🎉 События</h1>
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>
        {useExternal ? 'Мероприятия академии' : 'События университета'}
      </h2>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка событий...</p>
        </div>
      ) : useExternal && externalEvents.length > 0 ? (
        renderExternalList()
      ) : events.length > 0 ? (
        renderInternalList()
      ) : (
        <div className="card">
          <p className="card-text">Нет доступных событий</p>
        </div>
      )}

      {detailLoading && (
        <div className="event-gallery-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading"><div className="spinner"></div><p>Загрузка...</p></div>
        </div>
      )}
      {detailEvent && !detailLoading && (
        <div
          className="event-gallery-overlay"
          onClick={closeDetail}
          role="dialog"
          aria-modal="true"
        >
          <div className="event-gallery-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="event-gallery-close" onClick={closeDetail}>×</button>
            {detailEvent.error ? (
              <div className="event-gallery-detail">
                <h3>{detailEvent.name}</h3>
                <p>Не удалось загрузить описание.</p>
              </div>
            ) : (
              <div className="event-gallery-detail">
                {detailEvent.banner_url && (
                  <div className="event-gallery-detail-banner">
                    <img src={detailEvent.banner_url} alt="" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                  </div>
                )}
                <h3>{detailEvent.name || detailEvent.title}</h3>
                {(detailEvent.date || detailEvent.date_end) && (
                  <p className="event-gallery-detail-date">
                    📅 {detailEvent.date ? new Date(detailEvent.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    {detailEvent.date_end && <> – {new Date(detailEvent.date_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</>}
                  </p>
                )}
                {detailEvent.location && <p className="event-gallery-detail-location">📍 {detailEvent.location}</p>}
                {detailEvent.description && <div className="event-gallery-detail-description">{detailEvent.description}</div>}
                {detailEvent.bot_link && (
                  <a href={detailEvent.bot_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Записаться
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <UserSwitcher />
    </div>
  );
};

export default EventsPage;

