import React, { useState, useEffect } from 'react';

const MockModeNotification = ({ error, onDismiss }) => {
  const [show, setShow] = useState(true);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
      if (onDismiss) onDismiss();
    }
  }, [countdown, onDismiss]);

  const downloadLogs = () => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error?.message || 'Unknown error',
      stack: error?.stack || '',
      url: window.location.href,
      userAgent: navigator.userAgent,
      apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
    };

    const blob = new Blob([JSON.stringify(errorLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!show) return null;

  return (
    <div className="mock-mode-notification">
      <div className="mock-notification-content">
        <div className="mock-notification-header">
          <span className="mock-notification-icon">⚠️</span>
          <h3>Используется мок-версия</h3>
        </div>
        <p className="mock-notification-text">
          Бэкенд недоступен. Приложение работает в режиме демонстрации с мок-данными.
        </p>
        {error && (
          <div className="mock-notification-error">
            <strong>Ошибка:</strong> {error.message || 'Не удалось подключиться к серверу'}
          </div>
        )}
        <div className="mock-notification-actions">
          <button 
            className="btn btn-secondary"
            onClick={downloadLogs}
          >
            📥 Скачать логи ошибки
          </button>
          {countdown > 0 ? (
            <span className="mock-notification-countdown">
              Уведомление исчезнет через {countdown} сек.
            </span>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={() => {
                setShow(false);
                if (onDismiss) onDismiss();
              }}
            >
              Понятно
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockModeNotification;

