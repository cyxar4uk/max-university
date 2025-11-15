import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentWidget = () => {
  const navigate = useNavigate();

  return (
    <div className="widget payment-widget">
      <div className="widget-header">
        <h3 className="widget-title">💳 Оплата</h3>
        <button 
          className="widget-more-btn"
          onClick={() => navigate('/payment')}
        >
          Все →
        </button>
      </div>
      <div className="widget-content">
        <div className="payment-widget-info">
          <div className="payment-widget-balance">
            <div className="balance-label">Баланс</div>
            <div className="balance-value">0 ₽</div>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/payment')}
          >
            Пополнить
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentWidget;

