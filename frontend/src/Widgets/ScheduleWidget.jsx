import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service.js';

const ScheduleWidget = ({ block, apiService: apiServiceProp }) => {
  const navigate = useNavigate();
  const api = apiServiceProp || apiService;
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextClass, setNextClass] = useState(null);

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

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const data = await api.getSchedule();
        const scheduleData = data.schedule || [];
        setSchedule(scheduleData);
        
        // Находим ближайшее занятие
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        let nearest = null;
        let minMinutes = Infinity;
        
        scheduleData.forEach((item) => {
          if (item.time_start && item.time_end) {
            const [startHour, startMin] = item.time_start.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            
            // Если занятие еще не началось или идет сейчас
            if (startMinutes >= currentTime - 30) {
              const diff = startMinutes - currentTime;
              if (diff < minMinutes && diff >= -30) {
                minMinutes = diff;
                nearest = item;
              }
            }
          }
        });
        
        if (nearest) {
          setNextClass(nearest);
        } else if (scheduleData.length > 0) {
          // Если ближайшего не найдено, берем первое
          setNextClass(scheduleData[0]);
        }
      } catch (error) {
        console.error('Error loading schedule:', error);
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [api]);

  if (loading) {
    return (
      <div className="widget schedule-widget">
        <div className="widget-header">
          <h3 className="widget-title">📅 Расписание</h3>
        </div>
        <div className="widget-content">
          <div className="widget-loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!nextClass) {
    return (
      <div className="widget schedule-widget">
        <div className="widget-header">
          <h3 className="widget-title">📅 Расписание</h3>
          <button 
            className="widget-more-btn"
            onClick={() => navigate('/schedule')}
          >
            Все →
          </button>
        </div>
        <div className="widget-content">
          <div className="widget-empty">Ближайших занятий нет</div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget schedule-widget">
      <div className="widget-header">
        <h3 className="widget-title">📅 Ближайшее занятие</h3>
        <button 
          className="widget-more-btn"
          onClick={() => navigate('/schedule')}
        >
          Все →
        </button>
      </div>
      <div className="widget-content">
        <div className="schedule-next-class-card">
          <div className="schedule-next-class-row">
            <span className="schedule-icon schedule-icon-cap">🎓</span>
            <span className="schedule-room">{formatRoom(nextClass.room || nextClass.location)}</span>
            <span className="schedule-time-range">
              {nextClass.time_start && nextClass.time_end 
                ? `${nextClass.time_start} - ${nextClass.time_end}`
                : nextClass.time || 'Время не указано'}
            </span>
          </div>
          <div className="schedule-next-class-row">
            <span className="schedule-course-name">
              {nextClass.type ? `(${nextClass.type[0]}) ` : ''}
              {nextClass.subject || nextClass.name || 'Название курса'}
            </span>
          </div>
          {nextClass.teacher && (
            <div className="schedule-next-class-row schedule-teacher">
              <span className="schedule-teacher-name">{nextClass.teacher}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleWidget;
