import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from './api-service';
import UserSwitcher from './UserSwitcher';

const SchedulePage = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const data = await apiService.getSchedule(date);
        setSchedule(data.schedule || []);
      } catch (error) {
        console.error('Error loading schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [date]);

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

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>
        Расписание на {new Date(date).toLocaleDateString('ru-RU')}
      </h2>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка расписания...</p>
        </div>
      ) : schedule.length > 0 ? (
        <div>
          {schedule.map((item) => (
            <div key={item.id} className="schedule-item">
              <div className="schedule-time">{item.time}</div>
              <div className="schedule-content">
                <div className="schedule-subject">{item.subject}</div>
                <div className="schedule-details">
                  📍 {item.room} • {item.type}
                </div>
                <div className="schedule-details">
                  👤 {item.teacher}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p className="card-text">На этот день расписания нет</p>
        </div>
      )}

      <UserSwitcher />
    </div>
  );
};

export default SchedulePage;

