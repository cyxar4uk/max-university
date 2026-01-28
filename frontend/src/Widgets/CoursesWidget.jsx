import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service.js';

const CoursesWidget = () => {
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
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const topCourses = courses.slice(0, 2);

  return (
    <div className="widget courses-widget">
      <div className="widget-header">
        <h3 className="widget-title">📚 Учебные материалы</h3>
        <button 
          className="widget-more-btn"
          onClick={() => navigate('/courses')}
        >
          Все →
        </button>
      </div>
      <div className="widget-content">
        {loading ? (
          <div className="widget-loading">Загрузка...</div>
        ) : topCourses.length > 0 ? (
          <div className="courses-widget-list">
            {topCourses.map((course) => (
              <div 
                key={course.id} 
                className="courses-widget-item"
                onClick={() => navigate('/courses')}
              >
                <div className="courses-widget-name">{course.name}</div>
                <div className="courses-widget-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${course.progress || 0}%` }}
                    />
                  </div>
                  <span className="courses-widget-progress-text">
                    {course.progress || 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="widget-empty">Курсов пока нет</div>
        )}
      </div>
    </div>
  );
};

export default CoursesWidget;

