import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service';

const EventsWidget = () => {
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
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const upcomingEvents = events.slice(0, 2);

  return (
    <div className="widget events-widget">
      <div className="widget-header">
        <h3 className="widget-title">🎉 Внеучебная жизнь</h3>
        <button 
          className="widget-more-btn"
          onClick={() => navigate('/events')}
        >
          Все →
        </button>
      </div>
      <div className="widget-content">
        {loading ? (
          <div className="widget-loading">Загрузка...</div>
        ) : upcomingEvents.length > 0 ? (
          <div className="events-widget-list">
            {upcomingEvents.map((event) => (
              <div 
                key={event.id} 
                className="events-widget-item"
                onClick={() => navigate('/events')}
              >
                <div className="events-widget-name">{event.name}</div>
                <div className="events-widget-date">
                  {new Date(event.date).toLocaleDateString('ru-RU')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="widget-empty">Событий пока нет</div>
        )}
      </div>
    </div>
  );
};

export default EventsWidget;

