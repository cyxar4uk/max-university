import React from 'react';
import { useNavigate } from 'react-router-dom';

const AnalyticsWidget = () => {
  const navigate = useNavigate();

  return (
    <div className="widget analytics-widget">
      <div className="widget-header">
        <h3 className="widget-title">📊 Аналитика</h3>
        <button 
          className="widget-more-btn"
          onClick={() => navigate('/admin')}
        >
          Все →
        </button>
      </div>
      <div className="widget-content">
        <div className="analytics-widget-stats">
          <div className="stat-item">
            <div className="stat-value">1,234</div>
            <div className="stat-label">Студентов</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">89</div>
            <div className="stat-label">Преподавателей</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsWidget;

