import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service.js';

const EventsPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await apiService.getEvents();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error loading events:', error);
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

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>События университета</h2>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка событий...</p>
        </div>
      ) : events.length > 0 ? (
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
      ) : (
        <div className="card">
          <p className="card-text">Нет доступных событий</p>
        </div>
      )}

      <UserSwitcher />
    </div>
  );
};

export default EventsPage;

