import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service';
import BackendWarning from '../components/BackendWarning.jsx';

const AdminSchedulePage = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    education_level: '', // бакалавриат, магистратура, аспирантура
    direction: '',
    course: '',
    group: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    time_start: '',
    time_end: '',
    subject: '',
    room: '',
    teacher: '',
    type: 'Лекция',
    education_level: '',
    direction: '',
    course: '',
    group: ''
  });

  useEffect(() => {
    loadSchedule();
  }, [filters]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSchedule(null, filters);
      setSchedule(data.schedule || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
      alert('Ошибка загрузки расписания');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    
    if (!formData.time_start || !formData.subject) {
      alert('Заполните обязательные поля: время начала и название предмета');
      return;
    }

    try {
      await apiService.createScheduleItem(formData);
      alert('Занятие успешно добавлено!');
      setShowAddForm(false);
      setFormData({
        time_start: '',
        time_end: '',
        subject: '',
        room: '',
        teacher: '',
        type: 'Лекция',
        education_level: '',
        direction: '',
        course: '',
        group: ''
      });
      loadSchedule();
    } catch (error) {
      console.error('Error creating schedule item:', error);
      alert('Ошибка при создании занятия: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteSchedule = async (itemId) => {
    if (!confirm('Удалить это занятие?')) return;
    
    try {
      await apiService.deleteScheduleItem(itemId);
      alert('Занятие удалено');
      loadSchedule();
    } catch (error) {
      console.error('Error deleting schedule item:', error);
      alert('Ошибка при удалении занятия');
    }
  };

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
        <h1 className="page-title">📅 Управление расписанием</h1>
      </div>

      {/* Фильтры */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title" style={{ marginBottom: '16px' }}>Фильтры</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div className="form-group">
            <label htmlFor="education_level">Уровень образования</label>
            <select
              id="education_level"
              value={filters.education_level}
              onChange={(e) => handleFilterChange('education_level', e.target.value)}
            >
              <option value="">Все</option>
              <option value="бакалавриат">Бакалавриат</option>
              <option value="магистратура">Магистратура</option>
              <option value="аспирантура">Аспирантура</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="direction">Направление</label>
            <input
              id="direction"
              type="text"
              value={filters.direction}
              onChange={(e) => handleFilterChange('direction', e.target.value)}
              placeholder="Например: Информатика"
            />
          </div>

          <div className="form-group">
            <label htmlFor="course">Курс</label>
            <select
              id="course"
              value={filters.course}
              onChange={(e) => handleFilterChange('course', e.target.value)}
            >
              <option value="">Все</option>
              <option value="1">1 курс</option>
              <option value="2">2 курс</option>
              <option value="3">3 курс</option>
              <option value="4">4 курс</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="group">Группа</label>
            <input
              id="group"
              type="text"
              value={filters.group}
              onChange={(e) => handleFilterChange('group', e.target.value)}
              placeholder="Например: ИНФ-21-1"
            />
          </div>
        </div>
      </div>

      {/* Кнопка добавления */}
      <button
        className="button primary"
        onClick={() => setShowAddForm(!showAddForm)}
        style={{ width: '100%', marginBottom: '16px' }}
      >
        {showAddForm ? 'Отмена' : '+ Добавить занятие'}
      </button>

      {/* Форма добавления */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 className="card-title">Добавить занятие</h2>
          <form onSubmit={handleAddSchedule}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label htmlFor="time_start">Время начала *</label>
                <input
                  id="time_start"
                  type="time"
                  value={formData.time_start}
                  onChange={(e) => setFormData({...formData, time_start: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="time_end">Время окончания</label>
                <input
                  id="time_end"
                  type="time"
                  value={formData.time_end}
                  onChange={(e) => setFormData({...formData, time_end: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="subject">Название предмета *</label>
              <input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                required
                placeholder="Например: Основы Go"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label htmlFor="room">Аудитория</label>
                <input
                  id="room"
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                  placeholder="B0308"
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Тип занятия</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Лекция">Лекция</option>
                  <option value="Семинар">Семинар</option>
                  <option value="Практика">Практика</option>
                  <option value="Лабораторная">Лабораторная</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="teacher">Преподаватель</label>
              <input
                id="teacher"
                type="text"
                value={formData.teacher}
                onChange={(e) => setFormData({...formData, teacher: e.target.value})}
                placeholder="ФИО преподавателя"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label htmlFor="form_education_level">Уровень образования</label>
                <select
                  id="form_education_level"
                  value={formData.education_level}
                  onChange={(e) => setFormData({...formData, education_level: e.target.value})}
                >
                  <option value="">Не указано</option>
                  <option value="бакалавриат">Бакалавриат</option>
                  <option value="магистратура">Магистратура</option>
                  <option value="аспирантура">Аспирантура</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="form_direction">Направление</label>
                <input
                  id="form_direction"
                  type="text"
                  value={formData.direction}
                  onChange={(e) => setFormData({...formData, direction: e.target.value})}
                  placeholder="Информатика"
                />
              </div>

              <div className="form-group">
                <label htmlFor="form_course">Курс</label>
                <select
                  id="form_course"
                  value={formData.course}
                  onChange={(e) => setFormData({...formData, course: e.target.value})}
                >
                  <option value="">Не указано</option>
                  <option value="1">1 курс</option>
                  <option value="2">2 курс</option>
                  <option value="3">3 курс</option>
                  <option value="4">4 курс</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="form_group">Группа</label>
                <input
                  id="form_group"
                  type="text"
                  value={formData.group}
                  onChange={(e) => setFormData({...formData, group: e.target.value})}
                  placeholder="ИНФ-21-1"
                />
              </div>
            </div>

            <button type="submit" className="button primary" style={{ width: '100%' }}>
              Добавить занятие
            </button>
          </form>
        </div>
      )}

      {/* Список занятий */}
      <div>
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Расписание</h2>
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Загрузка...</p>
          </div>
        ) : schedule.length > 0 ? (
          <div className="schedule-events">
            {schedule.map((item) => (
              <div key={item.id} className="schedule-event-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div className="schedule-event-time">
                      {item.time_start && item.time_end
                        ? `${item.time_start} - ${item.time_end}`
                        : item.time || 'Время не указано'}
                    </div>
                    <div className="schedule-event-row">
                      <span className="schedule-icon schedule-icon-cap">🎓</span>
                      <span className="schedule-event-room">{item.room || item.location || 'Аудитория'}</span>
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
                    {(item.education_level || item.direction || item.course || item.group) && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--max-text-secondary)' }}>
                        {item.education_level && <span>{item.education_level} </span>}
                        {item.direction && <span>• {item.direction} </span>}
                        {item.course && <span>• {item.course} курс </span>}
                        {item.group && <span>• {item.group}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => handleDeleteSchedule(item.id)}
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
            <p className="card-text">Нет занятий по выбранным фильтрам</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSchedulePage;

