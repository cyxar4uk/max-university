import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserSwitcher from '../UserSwitcher.jsx';

const PaymentPage = () => {
  const navigate = useNavigate();

  const payments = [
    { id: 1, name: 'Обучение', description: 'Оплата за семестр', amount: '120 000 ₽' },
    { id: 2, name: 'Вступительные взносы', description: 'Оплата вступительных экзаменов', amount: '5 000 ₽' },
    { id: 3, name: 'Прочие услуги', description: 'Оплата дополнительных услуг', amount: 'Различные суммы' }
  ];

  const handlePayment = (payment) => {
    alert(`Открывается оплата: ${payment.name}`);
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
        <h1 className="page-title">💳 Оплата</h1>
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Оплата услуг</h2>

      <div>
        {payments.map((payment) => (
          <div key={payment.id} className="card">
            <h3 className="card-title">{payment.name}</h3>
            <p className="card-text">{payment.description}</p>
            <p style={{ fontSize: '20px', fontWeight: '600', margin: '12px 0' }}>
              {payment.amount}
            </p>
            <button 
              className="btn btn-success"
              onClick={() => handlePayment(payment)}
            >
              Оплатить
            </button>
          </div>
        ))}
      </div>

      <UserSwitcher />
    </div>
  );
};

export default PaymentPage;

