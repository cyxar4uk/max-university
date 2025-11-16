import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiService from '../api-service';
import BackendWarning from '../components/BackendWarning.jsx';

const AdminEventsPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
    organizer: '',
    images: []
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await apiService.getEvents();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
      alert('Ошибка загрузки мероприятий');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.date) {
      alert('Заполните обязательные поля: название и дата');
      return;
    }

    try {
      const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');
      
      // Объединяем дату и время
      const dateTime = formData.time 
        ? `${formData.date}T${formData.time}:00`
        : `${formData.date}T10:00:00`;

      const eventData = {
        name: formData.name,
        description: formData.description,
        date: dateTime,
        location: formData.location || `Университет ${universityId}`,
        organizer: formData.organizer || 'Администрация университета',
        university_id: universityId,
        images: formData.images
      };

      await apiService.createEvent(eventData);
      alert('Мероприятие успешно создано!');
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        date: '',
        time: '',
        location: '',
        organizer: '',
        images: []
      });
      loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Ошибка при создании мероприятия: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Удалить это мероприятие?')) return;
    
    try {
      // TODO: Добавить API для удаления
      alert('Функция удаления будет добавлена');
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Ошибка при удалении мероприятия');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка мероприятий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <BackendWarning />
      <div className="page-header">
        <button 
          onClick={() => navigate('/admin')}
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
        <h1 className="page-title">🎉 Управление мероприятиями</h1>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <button
          className="button primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ width: '100%', marginBottom: '16px' }}
        >
          {showCreateForm ? 'Отмена' : '+ Создать мероприятие'}
        </button>

        {showCreateForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">Создать новое мероприятие</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label htmlFor="eventName">Название мероприятия *</label>
                <input
                  id="eventName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Например: Кейс-чемпионат для школьников DEADLINE"
                />
              </div>

              <div className="form-group">
                <label htmlFor="eventDescription">Описание</label>
                <textarea
                  id="eventDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="4"
                  placeholder="Подробное описание мероприятия..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="eventDate">Дата *</label>
                  <input
                    id="eventDate"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="eventTime">Время</label>
                  <input
                    id="eventTime"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="eventLocation">Место проведения</label>
                <input
                  id="eventLocation"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Будет использовано название университета, если не указано"
                />
              </div>

              <div className="form-group">
                <label htmlFor="eventOrganizer">Организатор</label>
                <input
                  id="eventOrganizer"
                  type="text"
                  value={formData.organizer}
                  onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                  placeholder="Администрация университета"
                />
              </div>

              <button type="submit" className="button primary" style={{ width: '100%' }}>
                Создать мероприятие
              </button>
            </form>
          </div>
        )}
      </div>

      <div>
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Существующие мероприятия</h2>
        {events.length > 0 ? (
          <div className="events-admin-list">
            {events.map((event) => (
              <div key={event.id} className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 className="card-title" style={{ marginBottom: '8px' }}>{event.name}</h3>
                    {event.description && (
                      <p className="card-text" style={{ marginBottom: '8px', fontSize: '14px' }}>
                        {event.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--max-text-secondary)' }}>
                      {event.date && (
                        <span>📅 {new Date(event.date).toLocaleDateString('ru-RU')}</span>
                      )}
                      {event.location && (
                        <span>📍 {event.location}</span>
                      )}
                      {event.organizer && (
                        <span>👤 {event.organizer}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => handleDeleteEvent(event.id)}
                    style={{ marginLeft: '12px' }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <p className="card-text">Нет созданных мероприятий</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEventsPage;

