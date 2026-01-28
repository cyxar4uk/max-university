import React, { useState, useEffect } from 'react';
import apiService from '../api-service.js';

/**
 * Компонент предупреждения о недоступности бэкенда
 * Показывается на страницах, которые требуют взаимодействия с бэкендом
 */
const BackendWarning = () => {
  const [isMockMode, setIsMockMode] = useState(apiService.isMockMode());

  useEffect(() => {
    // Подписываемся на изменения мок-режима
    const unsubscribe = apiService.onMockModeChange((enabled) => {
      setIsMockMode(enabled);
    });

    return unsubscribe;
  }, []);

  if (!isMockMode) {
    return null; // Не показываем, если бэкенд доступен
  }

  return (
    <div className="backend-warning">
      <div className="backend-warning-content">
        <div className="backend-warning-icon">⚠️</div>
        <div className="backend-warning-text">
          <strong>Внимание:</strong> Вы используете мок-версию приложения.
          <br />
          Некоторые функции могут быть недоступны. Для полного тестирования запустите приложение локально с бэкендом.
        </div>
      </div>
    </div>
  );
};

export default BackendWarning;

