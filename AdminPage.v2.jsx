import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from './api-service';
import BackendWarning from './components/BackendWarning.jsx';

const roles = ['student', 'applicant', 'employee', 'admin'];
const roleNames = {
  student: 'Студент',
  applicant: 'Абитуриент',
  employee: 'Сотрудник',
  admin: 'Администратор'
};

const AdminPage = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const data = await apiService.getStatistics();
        setStatistics(data);
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  return (
    <div className="page">
      <BackendWarning />
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
        <h1 className="page-title">📊 Панель администратора</h1>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Настройка интерфейса</h2>
        <div className="grid">
          {roles.map((role) => (
            <div
              key={role}
              className="card card-clickable"
              onClick={() => navigate(`/admin/config/${role}`)}
            >
              <h3 className="card-title">{roleNames[role]}</h3>
              <p className="card-text">Настроить разделы и блоки</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Коды приглашения</h2>
        <div className="card card-clickable" onClick={() => navigate('/admin/invitation-codes')}>
          <h3 className="card-title">🎫 Управление кодами</h3>
          <p className="card-text">Генерация и импорт кодов приглашения</p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Расписание</h2>
        <div className="card card-clickable" onClick={() => navigate('/admin/schedule')}>
          <h3 className="card-title">📅 Управление расписанием</h3>
          <p className="card-text">Редактирование расписания с фильтрами</p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Мероприятия</h2>
        <div className="card card-clickable" onClick={() => navigate('/admin/events')}>
          <h3 className="card-title">🎉 Управление мероприятиями</h3>
          <p className="card-text">Создание и редактирование мероприятий</p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Кастомные блоки</h2>
        <div className="card card-clickable" onClick={() => navigate('/admin/custom-blocks')}>
          <h3 className="card-title">📦 Создать кастомный блок</h3>
          <p className="card-text">Отправить свой виджет на модерацию</p>
        </div>
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Статистика университета</h2>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка статистики...</p>
        </div>
      ) : statistics ? (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{statistics.total_users}</div>
            <div className="stat-label">Всего пользователей</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{statistics.active_students}</div>
            <div className="stat-label">Активных студентов</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{statistics.faculty_members}</div>
            <div className="stat-label">Преподавателей</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{statistics.events_this_month}</div>
            <div className="stat-label">Событий в месяце</div>
          </div>

          <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
            <div className="stat-value">{statistics.average_gpa}</div>
            <div className="stat-label">Средний GPA</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="card-text">Не удалось загрузить статистику</p>
        </div>
      )}

    </div>
  );
};

export default AdminPage;

