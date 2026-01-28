import React from 'react';
import { useNavigate } from 'react-router-dom';

const ServicesWidget = () => {
  const navigate = useNavigate();

  const services = [
    { id: 1, name: 'Заказ справки', icon: '📄' },
    { id: 2, name: 'Подача заявления', icon: '📝' },
    { id: 3, name: 'Оплата услуг', icon: '💳' },
  ];

  return (
    <div className="widget services-widget">
      <div className="widget-header">
        <h3 className="widget-title">📝 Услуги</h3>
        <button 
          className="widget-more-btn"
          onClick={() => navigate('/services')}
        >
          Все →
        </button>
      </div>
      <div className="widget-content">
        <div className="services-widget-list">
          {services.map((service) => (
            <div 
              key={service.id} 
              className="services-widget-item"
              onClick={() => navigate('/services')}
            >
              <span className="services-widget-icon">{service.icon}</span>
              <span className="services-widget-name">{service.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServicesWidget;

