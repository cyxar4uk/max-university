import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdmissionWidget = () => {
  const navigate = useNavigate();

  return (
    <div className="widget admission-widget">
      <div className="widget-header">
        <h3 className="widget-title">📄 Поступление</h3>
        <button 
          className="widget-more-btn"
          onClick={() => navigate('/admission')}
        >
          Все →
        </button>
      </div>
      <div className="widget-content">
        <div className="admission-widget-info">
          <p>Подача документов на поступление</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/admission')}
          >
            Подать заявление
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdmissionWidget;

