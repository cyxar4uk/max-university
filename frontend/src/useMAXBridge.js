import { useEffect, useState, useCallback } from 'react';
import { getMockUserByRole } from './mockUsers.js';

/**
 * Custom hook для работы с MAX Bridge
 * Использует глобальный объект window.WebApp
 * Документация: https://dev.max.ru/docs/webapps/introduction
 */
export const useMAXBridge = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [launchParams, setLaunchParams] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [version, setVersion] = useState(null);

  useEffect(() => {
    const initBridge = () => {
      // Проверяем наличие тестового пользователя
      const testUser = localStorage.getItem('testUser');
      
      if (testUser) {
        // Используем тестового пользователя
        const user = JSON.parse(testUser);
        setUserInfo(user);
        setPlatform('test');
        setVersion('1.0-test');
        setIsInitialized(true);
        console.log('Using test user:', user);
        return;
      }

      if (window.WebApp) {
        try {
          window.WebApp.ready();
          const userData = window.WebApp.initDataUnsafe?.user;
          if (userData) {
            setUserInfo(userData);
          }
          const startParams = window.WebApp.initDataUnsafe?.start_param;
          if (startParams) {
            setLaunchParams(startParams);
          }
          setPlatform(window.WebApp.platform);
          setVersion(window.WebApp.version);
          setIsInitialized(true);
          console.log('MAX Bridge initialized successfully');
        } catch (error) {
          console.error('MAX Bridge initialization error:', error);
          setIsInitialized(true);
        }
      } else {
        console.warn('MAX Bridge not available, using mock mode');
        // Используем мок-пользователя по умолчанию
        const mockUser = getMockUserByRole('student');
        setUserInfo(mockUser);
        localStorage.setItem('testUser', JSON.stringify(mockUser));
        setIsInitialized(true);
      }
    };

    // Задержка для уверенности, что window.WebApp загружен
    setTimeout(initBridge, 100);
  }, []);

  const showBackButton = useCallback(() => {
    if (window.WebApp?.BackButton) {
      window.WebApp.BackButton.show();
    }
  }, []);

  const hideBackButton = useCallback(() => {
    if (window.WebApp?.BackButton) {
      window.WebApp.BackButton.hide();
    }
  }, []);

  const onBackButtonClick = useCallback((callback) => {
    if (window.WebApp?.BackButton) {
      window.WebApp.BackButton.onClick(callback);
    }
  }, []);

  const closeApp = useCallback(() => {
    if (window.WebApp) {
      window.WebApp.close();
    }
  }, []);

  const openExternalLink = useCallback((url) => {
    if (window.WebApp) {
      window.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, []);

  const hapticImpact = useCallback((style = 'light') => {
    if (window.WebApp?.HapticFeedback) {
      window.WebApp.HapticFeedback.impactOccurred(style);
    }
  }, []);

  const hapticNotification = useCallback((type = 'success') => {
    if (window.WebApp?.HapticFeedback) {
      window.WebApp.HapticFeedback.notificationOccurred(type);
    }
  }, []);

  const showMainButton = useCallback((text, onClick) => {
    if (window.WebApp?.MainButton) {
      window.WebApp.MainButton.setText(text);
      window.WebApp.MainButton.onClick(onClick);
      window.WebApp.MainButton.show();
    }
  }, []);

  const hideMainButton = useCallback(() => {
    if (window.WebApp?.MainButton) {
      window.WebApp.MainButton.hide();
    }
  }, []);

  return {
    isInitialized,
    userInfo,
    launchParams,
    platform,
    version,
    showBackButton,
    hideBackButton,
    onBackButtonClick,
    closeApp,
    openExternalLink,
    hapticImpact,
    hapticNotification,
    showMainButton,
    hideMainButton,
  };
};

export default useMAXBridge;

