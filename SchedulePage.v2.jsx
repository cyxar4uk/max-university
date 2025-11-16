import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from './api-service';

const SchedulePage = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const data = await apiService.getSchedule(dateStr);
        setSchedule(data.schedule || []);
      } catch (error) {
        console.error('Error loading schedule:', error);
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [selectedDate]);


  // Форматируем дату
  const formatDate = (date) => {
    const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const dayOfWeek = days[date.getDay()];
    
    return `${day} ${month} (${dayOfWeek})`;
  };

  // Навигация по датам
  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // Форматирование аудитории в четырехзначный формат
  const formatRoom = (room) => {
    if (!room) return 'Аудитория';
    // Если уже четырехзначный формат, возвращаем как есть
    if (/^[A-Z]\d{4}$/.test(room)) return room;
    // Если формат B308, преобразуем в B0308
    const match = room.match(/^([A-Z])(\d+)$/);
    if (match) {
      const letter = match[1];
      const number = match[2].padStart(4, '0');
      return `${letter}${number}`;
    }
    return room;
  };

  // Определение статуса пары (прошла, идет, будущая)
  const getClassStatus = (item) => {
    if (!item.time_start || !item.time_end) return 'future';
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = item.time_start.split(':').map(Number);
    const [endHour, endMin] = item.time_end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (currentTime < startMinutes) return 'future';
    if (currentTime >= startMinutes && currentTime <= endMinutes) return 'current';
    return 'past';
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
        <h1 className="page-title">📅 Расписание</h1>
      </div>

      {/* Навигация по датам */}
      <div className="schedule-date-nav">
        <button 
          className="schedule-nav-btn"
          onClick={() => changeDate(-1)}
        >
          ←
        </button>
        <div className="schedule-date-display">
          Расписание {formatDate(selectedDate)}
        </div>
        <button 
          className="schedule-nav-btn"
          onClick={() => changeDate(1)}
        >
          →
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка расписания...</p>
        </div>
      ) : (
        <div className="schedule-events">
            {schedule.length > 0 ? (
              schedule.map((item) => {
                const [startHour, startMin] = item.time_start 
                  ? item.time_start.split(':').map(Number)
                  : [14, 0];
                const [endHour, endMin] = item.time_end 
                  ? item.time_end.split(':').map(Number)
                  : [15, 30];
                
                // Определяем индикатор (если есть)
                const indicator = item.indicator || null;
                const indicatorType = item.indicator_type || null; // 'homework', 'minutes', etc.
                
                const status = getClassStatus(item);
                
                return (
                  <div key={item.id} className={`schedule-event-card schedule-event-${status}`}>
                    {indicator && (
                      <div className={`schedule-event-indicator schedule-indicator-${indicatorType || 'default'}`}>
                        {indicator}
                      </div>
                    )}
                    <div className="schedule-event-time">
                      {item.time_start && item.time_end
                        ? `${item.time_start} - ${item.time_end}`
                        : item.time || 'Время не указано'}
                    </div>
                    <div className="schedule-event-row">
                      <span className="schedule-icon schedule-icon-cap">🎓</span>
                      <span className="schedule-event-room">{formatRoom(item.room || item.location)}</span>
                    </div>
                    <div className="schedule-event-row">
                      <span className="schedule-event-course">
                        {item.type ? `(${item.type[0]}) ` : ''}
                        {item.subject || item.name || 'Название курса'}
                      </span>
                    </div>
                    {item.teacher && (
                      <div className="schedule-event-row schedule-event-teacher">
                        <span className="schedule-event-teacher-name">{item.teacher}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="card">
                <p className="card-text">На этот день расписания нет</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
