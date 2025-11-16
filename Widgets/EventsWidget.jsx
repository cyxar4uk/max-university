import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiService from '../api-service';

const EventsWidget = ({ block, apiService: apiServiceProp }) => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const api = apiServiceProp || apiService;
  const [events, setEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [universityName, setUniversityName] = useState('Центральный университет');

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');
        const data = await api.getEvents(universityId);
        setEvents(data.events || []);
        
        // Загружаем информацию об университете
        try {
          const uniData = await api.getUniversity(universityId);
          if (uniData.name) {
            setUniversityName(uniData.name);
          }
        } catch (e) {
          console.warn('Could not load university name');
        }

        // Загружаем список зарегистрированных событий
        try {
          const registrations = await api.getUserEventRegistrations();
          setRegisteredEvents(new Set(registrations.event_ids || []));
        } catch (e) {
          console.warn('Could not load event registrations');
        }
      } catch (error) {
        console.error('Error loading events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [api, user.universityId]);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowGallery(true);
    setCurrentImageIndex(0);
  };

  const handleCloseGallery = () => {
    setShowGallery(false);
    setSelectedEvent(null);
  };

  const handleRegister = async (eventId, e) => {
    e.stopPropagation();
    try {
      await api.registerForEvent(eventId);
      setRegisteredEvents(prev => new Set([...prev, eventId]));
      if (selectedEvent?.id === eventId) {
        setSelectedEvent({ ...selectedEvent, isRegistered: true });
      }
      alert('Вы успешно зарегистрировались на мероприятие!');
    } catch (error) {
      console.error('Registration error:', error);
      alert('Ошибка при регистрации на мероприятие');
    }
  };

  const handleAddToCalendar = (event, e) => {
    e.stopPropagation();
    
    if (!event.date) return;

    const eventDate = new Date(event.date);
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 2); // По умолчанию 2 часа

    // Формат для добавления в календарь (iCal/Google Calendar)
    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = formatDate(eventDate);
    const end = formatDate(endDate);

    // Создаем URL для добавления в календарь
    const title = encodeURIComponent(event.name || 'Мероприятие');
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location || universityName);
    
    // Google Calendar
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    
    // Пытаемся открыть календарь
    window.open(googleCalendarUrl, '_blank');
  };

  const handleNextImage = () => {
    if (selectedEvent?.images && selectedEvent.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedEvent.images.length);
    }
  };

  const handlePrevImage = () => {
    if (selectedEvent?.images && selectedEvent.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedEvent.images.length) % selectedEvent.images.length);
    }
  };

  // Генерируем изображения для событий, если их нет
  const getEventImage = (event, index) => {
    if (event.image) return event.image;
    // Генерируем градиент на основе индекса
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ];
    return gradients[index % gradients.length];
  };

  const isRegistered = (eventId) => {
    return registeredEvents.has(eventId);
  };

  return (
    <>
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
          ) : events.length > 0 ? (
            <div className="events-carousel">
              <div className="events-carousel-track">
                {events.map((event, index) => {
                  const registered = isRegistered(event.id);
                  return (
                    <div 
                      key={event.id} 
                      className="event-card"
                      onClick={() => handleEventClick(event)}
                    >
                      <div 
                        className="event-card-background"
                        style={{ background: getEventImage(event, index) }}
                      >
                        <div className="event-card-overlay"></div>
                      </div>
                      <div className="event-card-content">
                        <div className="event-card-header">
                          <div className="event-card-logo">{universityName.toUpperCase()}</div>
                          <div className="event-card-badge">• РЕГИСТРАЦИЯ ОТКРЫТА</div>
                        </div>
                        <div className="event-card-graphic">
                          <div className="event-card-graphic-screen">
                            <div className="event-card-title-main">{event.name}</div>
                            {event.date && (
                              <div className="event-card-date">
                                {new Date(event.date).toLocaleDateString('ru-RU', { 
                                  day: 'numeric', 
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="event-card-footer">
                          <div className="event-card-description">
                            {event.description || 'Чемпионат, в котором ты сможешь решить реальну...'}
                          </div>
                          <div className="event-card-actions">
                            {registered ? (
                              <>
                                <div className="event-card-action-btn event-card-action-registered">
                                  <span className="event-card-checkmark">✓</span>
                                  <span>Ты участвуешь</span>
                                </div>
                                <div 
                                  className="event-card-action-btn event-card-calendar"
                                  onClick={(e) => handleAddToCalendar(event, e)}
                                  title="Добавить в календарь"
                                >
                                  <span>📅</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div 
                                  className="event-card-action-btn event-card-action-participate"
                                  onClick={(e) => handleRegister(event.id, e)}
                                >
                                  <span>Участвовать</span>
                                </div>
                                <div className="event-card-action-btn event-card-more">
                                  <span>⋯</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="widget-empty">Событий пока нет</div>
          )}
        </div>
      </div>

      {/* Галерея с подробной информацией */}
      {showGallery && selectedEvent && (
        <div className="event-gallery-overlay" onClick={handleCloseGallery}>
          <div className="event-gallery-content" onClick={(e) => e.stopPropagation()}>
            <button className="event-gallery-close" onClick={handleCloseGallery}>×</button>
            
            {selectedEvent.images && selectedEvent.images.length > 0 ? (
              <div className="event-gallery-images">
                <button 
                  className="event-gallery-nav event-gallery-prev"
                  onClick={handlePrevImage}
                >
                  ‹
                </button>
                <div className="event-gallery-main-image">
                  <img 
                    src={selectedEvent.images[currentImageIndex]} 
                    alt={selectedEvent.name}
                  />
                </div>
                <button 
                  className="event-gallery-nav event-gallery-next"
                  onClick={handleNextImage}
                >
                  ›
                </button>
                <div className="event-gallery-thumbnails">
                  {selectedEvent.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${selectedEvent.name} ${idx + 1}`}
                      className={idx === currentImageIndex ? 'active' : ''}
                      onClick={() => setCurrentImageIndex(idx)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div 
                className="event-gallery-main-image"
                style={{ background: getEventImage(selectedEvent, 0) }}
              >
                <div className="event-gallery-placeholder">
                  <h2>{selectedEvent.name}</h2>
                </div>
              </div>
            )}

            <div className="event-gallery-info">
              <h2 className="event-gallery-title">{selectedEvent.name}</h2>
              {selectedEvent.date && (
                <div className="event-gallery-date">
                  📅 {new Date(selectedEvent.date).toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
              {selectedEvent.location && (
                <div className="event-gallery-location">
                  📍 {selectedEvent.location}
                </div>
              )}
              {selectedEvent.description && (
                <div className="event-gallery-description">
                  {selectedEvent.description}
                </div>
              )}
              {selectedEvent.organizer && (
                <div className="event-gallery-organizer">
                  Организатор: {selectedEvent.organizer}
                </div>
              )}
              <div className="event-gallery-actions">
                {isRegistered(selectedEvent.id) ? (
                  <>
                    <button 
                      className="event-gallery-register-btn event-gallery-registered"
                      disabled
                    >
                      ✓ Вы зарегистрированы
                    </button>
                    <button 
                      className="event-gallery-share-btn"
                      onClick={(e) => handleAddToCalendar(selectedEvent, e)}
                    >
                      📅 Добавить в календарь
                    </button>
                  </>
                ) : (
                  <button 
                    className="event-gallery-register-btn"
                    onClick={(e) => handleRegister(selectedEvent.id, e)}
                  >
                    Зарегистрироваться
                  </button>
                )}
                <button className="event-gallery-share-btn">
                  Поделиться
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EventsWidget;
