import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from './api-service';

const CoursePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const data = await apiService.getCourseDetails(id);
        setCourse(data);
      } catch (error) {
        console.error('Error loading course:', error);
        // Используем мок-данные при ошибке (используем данные из api-service)
        const mockCourses = {
          1: {
            id: 1,
            name: "Математический анализ",
            authors: "А.С. Глебов К.И. Иванов",
            description: "Курс по математическому анализу охватывает основы дифференциального и интегрального исчисления, теорию пределов, ряды и функции многих переменных. Изучите фундаментальные концепции математики, необходимые для дальнейшего изучения точных наук и инженерии.",
            weeks: [
              { id: 0, title: "Введение", subtitle: null, isActive: false, status: "past" },
              { id: 1, title: "Неделя 1", subtitle: "Пределы и непрерывность функций", isActive: false, status: "past" },
              { id: 2, title: "Неделя 2", subtitle: "Производная и дифференциал", isActive: false, status: "past" },
              { id: 3, title: "Неделя 3", subtitle: "Применение производных", isActive: false, status: "past" },
              { id: 4, title: "Неделя 4", subtitle: "Интегральное исчисление", isActive: false, status: "past" },
              { id: 5, title: "Неделя 5", subtitle: "Определенный интеграл", isActive: true, status: "active" },
              { id: 6, title: "Неделя 6", subtitle: "Ряды и их сходимость", isActive: false, status: "future" },
              { id: 7, title: "Неделя 7", subtitle: "Функции многих переменных", isActive: false, status: "future" },
              { id: 8, title: "Неделя 8", subtitle: "Кратные интегралы", isActive: false, status: "future" }
            ]
          }
        };
        setCourse(mockCourses[parseInt(id)] || mockCourses[1]);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadCourse();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка курса...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page">
        <div className="card">
          <p className="card-text">Курс не найден</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page course-page">
      <div className="page-header">
        <button 
          onClick={() => navigate('/courses')}
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
        <h1 className="page-title">{course.name}</h1>
      </div>

      <div className="course-content">
        {/* Авторы */}
        {course.authors && (
          <div className="course-authors">
            {course.authors}
          </div>
        )}

        {/* Описание курса */}
        {course.description && (
          <div className="course-description-section">
            <h2 className="course-section-title">О чем этот курс?</h2>
            <p className="course-description-text">{course.description}</p>
          </div>
        )}

        {/* Список недель/модулей */}
        <div className="course-weeks">
          {course.weeks && course.weeks.map((week) => {
            const status = week.status || (week.isActive ? 'active' : 'future');
            const isLocked = status === 'future';
            const isPast = status === 'past';
            
            return (
              <div 
                key={week.id} 
                className={`course-week-item course-week-${status} ${isLocked ? 'course-week-locked' : ''}`}
                onClick={() => {
                  if (isLocked) {
                    return; // Блокируем клик для будущих недель
                  }
                  // TODO: Переход на страницу недели
                  console.log('Open week:', week.id);
                }}
              >
                <div className="course-week-icon">{isLocked ? '🔒' : '📖'}</div>
                <div className="course-week-content">
                  <div className="course-week-header">
                    <span className="course-week-title">{week.title}</span>
                    {week.isActive && <span className="course-week-active-dot"></span>}
                  </div>
                  {week.subtitle && (
                    <div className="course-week-subtitle">{week.subtitle}</div>
                  )}
                </div>
                {!isLocked && <div className="course-week-arrow">→</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;

