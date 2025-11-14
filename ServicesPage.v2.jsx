import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserSwitcher from './UserSwitcher';

const ServicesPage = () => {
  const navigate = useNavigate();

  const services = [
    { id: 1, name: 'Заказ справки', description: 'Справка с места учебы/работы', icon: '📄' },
    { id: 2, name: 'Подача заявления', description: 'Подать заявление на различные услуги', icon: '📝' },
    { id: 3, name: 'Оплата услуг', description: 'Оплата дополнительных услуг', icon: '💳' },
    { id: 4, name: 'Пропуск', description: 'Заказ гостевого пропуска', icon: '🎫' }
  ];

  const handleServiceClick = (service) => {
    alert(`Открывается: ${service.name}`);
  };

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
        <h1 className="page-title">📝 Электронные услуги</h1>
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Доступные услуги</h2>

      <div>
        {services.map((service) => (
          <div key={service.id} className="card card-clickable">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '32px' }}>{service.icon}</div>
              <div>
                <h3 className="card-title" style={{ marginBottom: '4px' }}>{service.name}</h3>
                <p className="card-text">{service.description}</p>
              </div>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => handleServiceClick(service)}
            >
              Заказать
            </button>
          </div>
        ))}
      </div>

      <UserSwitcher />
    </div>
  );
};

export default ServicesPage;

