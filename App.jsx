import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import '@vkontakte/vkui/dist/vkui.css';

import { store } from './store';
import WelcomePage from './WelcomePage';
import HomePage from './HomePage';
import ProfilePage from './ProfilePage';
import CoursePage from './CoursePage';
import SchedulePage from './SchedulePage';
import AdminPage from './AdminPage';
import ServicesPage from './ServicesPage';
import EventsPage from './EventsPage';
import NewsPage from './NewsPage';
import PaymentPage from './PaymentPage';
import AdmissionPage from './AdmissionPage';

function App() {
  useEffect(() => {
    // Инициализация MAX Bridge
    // Глобальный объект window.WebApp уже доступен после подключения скрипта
    if (window.WebApp) {
      // Сообщаем MAX, что мини-приложение готово
      window.WebApp.ready();

      // Логируем информацию о пользователе и стартовых параметрах
      console.log('WebApp initialized');
      console.log('Init data:', window.WebApp.initData);
      console.log('User:', window.WebApp.initDataUnsafe?.user);
      console.log('Start params:', window.WebApp.initDataUnsafe?.start_param);
      console.log('Platform:', window.WebApp.platform);
      console.log('Version:', window.WebApp.version);

      // Обработка нажатия кнопки "Назад"
      window.WebApp.BackButton.onClick(() => {
        window.history.back();
      });
    } else {
      console.warn('MAX Bridge not available. Running in development mode.');
    }

    return () => {
      // Очистка при размонтировании
      if (window.WebApp) {
        window.WebApp.BackButton.offClick(() => {});
      }
    };
  }, []);

  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/course/:id" element={<CoursePage />} />
          <Route path="/courses" element={<CoursePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/admission" element={<AdmissionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;


