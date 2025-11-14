import { useEffect, useState, useCallback } from 'react';

/**
 * Custom hook для работы с MAX Bridge
 * Использует глобальный объект window.WebApp вместо VK Bridge
 */
export const useMAXBridge = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [launchParams, setLaunchParams] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [version, setVersion] = useState(null);
  const [backButtonVisible, setBackButtonVisible] = useState(false);

  useEffect(() => {
    const initBridge = () => {
      if (window.WebApp) {
        try {
          // Сообщаем, что приложение готово
          window.WebApp.ready();
          
          // Получаем информацию о пользователе из initDataUnsafe
          const userData = window.WebApp.initDataUnsafe?.user;
          if (userData) {
            setUserInfo(userData);
          }
          
          // Получаем стартовые параметры
          const startParams = window.WebApp.initDataUnsafe?.start_param;
          if (startParams) {
            setLaunchParams(startParams);
          }
          
          // Получаем платформу и версию
          setPlatform(window.WebApp.platform);
          setVersion(window.WebApp.version);
          
          setIsInitialized(true);
          console.log('MAX Bridge initialized successfully');
        } catch (error) {
          console.error('MAX Bridge initialization error:', error);
        }
      } else {
        console.warn('MAX Bridge not available');
        // Для разработки без MAX можем использовать моки
        setIsInitialized(true);
      }
    };

    initBridge();
  }, []);

  // Показать кнопку "Назад"
  const showBackButton = useCallback(() => {
    if (window.WebApp?.BackButton) {
      window.WebApp.BackButton.show();
      setBackButtonVisible(true);
    }
  }, []);

  // Скрыть кнопку "Назад"
  const hideBackButton = useCallback(() => {
    if (window.WebApp?.BackButton) {
      window.WebApp.BackButton.hide();
      setBackButtonVisible(false);
    }
  }, []);

  // Установить обработчик клика на кнопку "Назад"
  const onBackButtonClick = useCallback((callback) => {
    if (window.WebApp?.BackButton) {
      window.WebApp.BackButton.onClick(callback);
    }
  }, []);

  // Закрыть приложение
  const closeApp = useCallback(() => {
    if (window.WebApp) {
      window.WebApp.close();
    }
  }, []);

  // Открыть ссылку во внешнем браузере
  const openExternalLink = useCallback((url) => {
    if (window.WebApp) {
      window.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, []);

  // Открыть другое мини-приложение в MAX
  const openMaxApp = useCallback((botName, startParam = '') => {
    if (window.WebApp) {
      const url = `https://max.ru/${botName}?startapp=${startParam}`;
      window.WebApp.openMaxLink(url);
    }
  }, []);

  // Поделиться контентом в MAX
  const shareToMax = useCallback((text, link) => {
    if (window.WebApp) {
      return new Promise((resolve, reject) => {
        window.WebApp.onEvent('WebAppMaxShare', (eventData) => {
          if (eventData.status === 'shared') {
            resolve(eventData);
          } else if (eventData.status === 'cancelled') {
            reject(new Error('Share cancelled'));
          } else if (eventData.error) {
            reject(new Error(eventData.error.code));
          }
        });
        window.WebApp.shareMaxContent({ text, link });
      });
    }
  }, []);

  // Поделиться контентом во внешних приложениях
  const shareExternal = useCallback((text, link) => {
    if (window.WebApp) {
      return new Promise((resolve, reject) => {
        window.WebApp.onEvent('WebAppShare', (eventData) => {
          if (eventData.status === 'shared') {
            resolve(eventData);
          } else if (eventData.status === 'cancelled') {
            reject(new Error('Share cancelled'));
          } else if (eventData.error) {
            reject(new Error(eventData.error.code));
          }
        });
        window.WebApp.shareContent({ text, link });
      });
    }
  }, []);

  // Запросить номер телефона
  const requestPhone = useCallback(() => {
    if (window.WebApp) {
      return new Promise((resolve, reject) => {
        window.WebApp.onEvent('WebAppRequestPhone', (eventData) => {
          if (eventData.phone) {
            resolve(eventData.phone);
          } else {
            reject(new Error('Phone request failed'));
          }
        });
        window.WebApp.requestContact();
      });
    }
  }, []);

  // Открыть QR код сканер
  const openQRScanner = useCallback(() => {
    if (window.WebApp) {
      return new Promise((resolve, reject) => {
        window.WebApp.onEvent('WebAppOpenCodeReader', (eventData) => {
          if (eventData.value) {
            resolve(eventData.value);
          } else if (eventData.error) {
            reject(new Error(eventData.error.code));
          }
        });
        window.WebApp.openCodeReader(true);
      });
    }
  }, []);

  // Включить/отключить подтверждение закрытия
  const setupClosingBehavior = useCallback((needConfirmation) => {
    if (window.WebApp) {
      if (needConfirmation) {
        window.WebApp.enableClosingConfirmation();
      } else {
        window.WebApp.disableClosingConfirmation();
      }
    }
  }, []);

  // Включить/отключить скриншоты
  const setScreenCaptureEnabled = useCallback((enabled) => {
    if (window.WebApp?.ScreenCapture) {
      if (enabled) {
        window.WebApp.ScreenCapture.disableScreenCapture();
      } else {
        window.WebApp.ScreenCapture.enableScreenCapture();
      }
    }
  }, []);

  // Тактильная обратная связь - импакт
  const hapticImpact = useCallback((style = 'light') => {
    if (window.WebApp?.HapticFeedback) {
      // light, medium, heavy, rigid, soft
      window.WebApp.HapticFeedback.impactOccurred(style);
    }
  }, []);

  // Тактильная обратная связь - уведомление
  const hapticNotification = useCallback((type = 'success') => {
    if (window.WebApp?.HapticFeedback) {
      // success, warning, error
      window.WebApp.HapticFeedback.notificationOccurred(type);
    }
  }, []);

  // Тактильная обратная связь - изменение выбора
  const hapticSelectionChange = useCallback(() => {
    if (window.WebApp?.HapticFeedback) {
      window.WebApp.HapticFeedback.selectionChanged();
    }
  }, []);

  return {
    isInitialized,
    userInfo,
    launchParams,
    platform,
    version,
    backButtonVisible,
    showBackButton,
    hideBackButton,
    onBackButtonClick,
    closeApp,
    openExternalLink,
    openMaxApp,
    shareToMax,
    shareExternal,
    requestPhone,
    openQRScanner,
    setupClosingBehavior,
    setScreenCaptureEnabled,
    hapticImpact,
    hapticNotification,
    hapticSelectionChange,
  };
};

export default useMAXBridge;