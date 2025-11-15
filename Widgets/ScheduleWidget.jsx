import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service';

const ScheduleWidget = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date] = useState(new Date());

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const data = await apiService.getSchedule(date.toISOString().split('T')[0]);
        setSchedule(data.schedule || []);
      } catch (error) {
        console.error('Error loading schedule:', error);
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [date]);

  const todaySchedule = schedule.slice(0, 3); // Показываем только первые 3 занятия

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
        {loading ? (
          <div className="widget-loading">Загрузка...</div>
        ) : todaySchedule.length > 0 ? (
          <div className="schedule-widget-list">
            {todaySchedule.map((item) => (
              <div key={item.id} className="schedule-widget-item">
                <div className="schedule-widget-time">{item.time}</div>
                <div className="schedule-widget-info">
                  <div className="schedule-widget-subject">{item.subject}</div>
                  <div className="schedule-widget-details">{item.room}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="widget-empty">На сегодня занятий нет</div>
        )}
      </div>
    </div>
  );
};

export default ScheduleWidget;

