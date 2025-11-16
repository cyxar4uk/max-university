import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store.js';
import './styles.css';
import apiService from './api-service.js';
import MockModeNotification from './components/MockModeNotification.jsx';

// Pages
import WelcomePage from './WelcomePage.v2.jsx';
import HomePage from './HomePage.v2.jsx';
import ProfilePage from './ProfilePage.v2.jsx';
import SchedulePage from './SchedulePage.v2.jsx';
import CoursesPage from './CoursesPage.v2.jsx';
import CoursePage from './CoursePage.v2.jsx';
import AdminPage from './AdminPage.v2.jsx';
import AdminConfigPage from './AdminConfigPage.v2.jsx';
import CustomBlocksPage from './pages/CustomBlocksPage.v2.jsx';
import InvitationCodesPage from './pages/InvitationCodesPage.v2.jsx';
import SuperAdminPage from './pages/SuperAdminPage.v2.jsx';
import AdminEventsPage from './pages/AdminEventsPage.v2.jsx';
import AdminSchedulePage from './pages/AdminSchedulePage.v2.jsx';
import ServicesPage from './ServicesPage.v2.jsx';
import EventsPage from './EventsPage.v2.jsx';
import NewsPage from './NewsPage.v2.jsx';
import PaymentPage from './PaymentPage.v2.jsx';
import AdmissionPage from './AdmissionPage.v2.jsx';

function App() {
  const [mockModeError, setMockModeError] = useState(null);
  const [showMockNotification, setShowMockNotification] = useState(false);

  useEffect(() => {
    // Suppress React Router future flags warnings
    window.__reactRouterVersion = 6;
    // Инициализация MAX Bridge
    if (window.WebApp) {
      window.WebApp.ready();
      console.log('MAX Bridge initialized');
      console.log('User:', window.WebApp.initDataUnsafe?.user);
      console.log('Start params:', window.WebApp.initDataUnsafe?.start_param);
    } else {
      console.warn('MAX Bridge not available, using mock mode');
    }

    // Подписываемся на изменения мок-режима
    const unsubscribe = apiService.onMockModeChange((enabled, error) => {
      if (enabled) {
        setMockModeError(error);
        setShowMockNotification(true);
      } else {
        setShowMockNotification(false);
        setMockModeError(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Provider store={store}>
      <Router>
        {showMockNotification && (
          <MockModeNotification 
            error={mockModeError}
            onDismiss={() => setShowMockNotification(false)}
          />
        )}
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CoursePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/config/:role" element={<AdminConfigPage />} />
                  <Route path="/admin/custom-blocks" element={<CustomBlocksPage />} />
                  <Route path="/admin/invitation-codes" element={<InvitationCodesPage />} />
                  <Route path="/admin/events" element={<AdminEventsPage />} />
                  <Route path="/admin/schedule" element={<AdminSchedulePage />} />
                  <Route path="/superadmin" element={<SuperAdminPage />} />
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
