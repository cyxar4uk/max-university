import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store.js';
import './styles.css';
import apiService from './api-service.js';
import MockModeNotification from './components/MockModeNotification.jsx';

// Layout
import MainLayout from './components/MainLayout.jsx';
// Pages
import WelcomePage from './pages/WelcomePage.jsx';
import HomePage from './pages/HomePage.jsx';
import HubPage from './pages/HubPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import CoursesPage from './pages/CoursesPage.jsx';
import CoursePage from './pages/CoursePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AdminConfigPage from './pages/AdminConfigPage.jsx';
import CustomBlocksPage from './pages/CustomBlocksPage.jsx';
import InvitationCodesPage from './pages/InvitationCodesPage.jsx';
import SuperAdminPage from './pages/SuperAdminPage.jsx';
import AdminEventsPage from './pages/AdminEventsPage.jsx';
import AdminSchedulePage from './pages/AdminSchedulePage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import NewsPage from './pages/NewsPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import AdmissionPage from './pages/AdmissionPage.jsx';
import AdmissionLevelPage from './pages/AdmissionLevelPage.jsx';
import AdmissionDirectionsPage from './pages/AdmissionDirectionsPage.jsx';
import AdmissionApplyPage from './pages/AdmissionApplyPage.jsx';
import AdmissionMyApplicationsPage from './pages/AdmissionMyApplicationsPage.jsx';
import AdminApplicationsPage from './pages/AdminApplicationsPage.jsx';

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
          <Route element={<MainLayout />}>
            <Route path="home" element={<HomePage />} />
            <Route path="hub" element={<HubPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:id" element={<CoursePage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/config/:role" element={<AdminConfigPage />} />
            <Route path="admin/custom-blocks" element={<CustomBlocksPage />} />
            <Route path="admin/invitation-codes" element={<InvitationCodesPage />} />
            <Route path="admin/events" element={<AdminEventsPage />} />
            <Route path="admin/schedule" element={<AdminSchedulePage />} />
            <Route path="superadmin" element={<SuperAdminPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="payment" element={<PaymentPage />} />
            <Route path="admission" element={<AdmissionPage />} />
            <Route path="admission/level" element={<AdmissionLevelPage />} />
            <Route path="admission/directions/:level" element={<AdmissionDirectionsPage />} />
            <Route path="admission/apply/:directionId" element={<AdmissionApplyPage />} />
            <Route path="admission/my-applications" element={<AdmissionMyApplicationsPage />} />
            <Route path="admin/applications" element={<AdminApplicationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
