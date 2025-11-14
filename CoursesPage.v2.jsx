import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from './api-service';
import UserSwitcher from './UserSwitcher';

const CoursesPage = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await apiService.getCourses();
        setCourses(data.courses || []);
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

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
        <h1 className="page-title">📚 Учебные материалы</h1>
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Мои курсы</h2>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка курсов...</p>
        </div>
      ) : courses.length > 0 ? (
        <div>
          {courses.map((course) => (
            <div key={course.id} className="card">
              <h3 className="card-title">{course.name}</h3>
              
              <div style={{ marginBottom: '12px' }}>
                <p className="card-text" style={{ marginBottom: '4px' }}>
                  Прогресс: {course.progress}%
                </p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              </div>

              <p className="card-text">📝 Заданий: {course.assignments}</p>
              <p className="card-text">📅 Следующее занятие: {course.next_class}</p>
              
              <button className="btn btn-primary" style={{ marginTop: '12px' }}>
                Открыть курс
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p className="card-text">Нет доступных курсов</p>
        </div>
      )}

      <UserSwitcher />
    </div>
  );
};

export default CoursesPage;

