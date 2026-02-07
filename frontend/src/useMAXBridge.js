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
      // Сначала проверяем MAX Bridge: реальные имя/фамилия приходят из initDataUnsafe.user
      if (window.WebApp) {
        try {
          window.WebApp.ready();
          const userData = window.WebApp.initDataUnsafe?.user;
          if (userData) {
            setUserInfo(userData);
            setPlatform(window.WebApp.platform ?? 'max');
            setVersion(window.WebApp.version ?? '');
            setIsInitialized(true);
            console.log('MAX Bridge: user from initDataUnsafe', userData.first_name, userData.last_name);
            return;
          }
          const startParams = window.WebApp.initDataUnsafe?.start_param;
          if (startParams) setLaunchParams(startParams);
          setPlatform(window.WebApp.platform);
          setVersion(window.WebApp.version);
          setIsInitialized(true);
          console.log('MAX Bridge initialized (no user in initDataUnsafe)');
          return;
        } catch (error) {
          console.error('MAX Bridge initialization error:', error);
        }
      }

      // Нет WebApp или нет user — тестовый пользователь из localStorage (разработка) или мок
      const testUserJson = localStorage.getItem('testUser');
      const testUser = testUserJson ? (() => { try { return JSON.parse(testUserJson); } catch { return null; } })() : null;
      const userToSet = testUser ?? getMockUserByRole('student');
      setUserInfo(userToSet);
      setPlatform(testUser ? 'test' : 'web');
      setVersion('1.0');
      setIsInitialized(true);
      if (!window.WebApp) {
        console.warn('MAX Bridge not available, using mock user');
      }
    };

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

