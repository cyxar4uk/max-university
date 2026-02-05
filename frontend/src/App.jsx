import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store.js';
import { setUserFromMAX } from './userSlice.js';
import './styles.css';
import apiService from './api-service.js';
import MockModeNotification from './components/MockModeNotification.jsx';
import { getMockUserByRole } from './mockUsers.js';

// Layout
import MainLayout from './components/MainLayout.jsx';
import StudyGate from './components/StudyGate.jsx';
// Pages
import WelcomePage from './pages/WelcomePage.jsx';
import MainPage from './pages/MainPage.jsx';
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
    // Инициализация MAX Bridge и синхронизация пользователя в Redux (имя, фамилия из MAX и БД; документация: https://dev.max.ru/docs-api)
    const initUser = async () => {
      if (window.WebApp) {
        window.WebApp.ready();
        const startParam = window.WebApp.initDataUnsafe?.start_param;
        if (startParam) {
          const roleMatch = startParam.match(/role=(\w+)/);
          const roleFromParam = roleMatch ? roleMatch[1] : startParam;
          if (roleFromParam) localStorage.setItem('userRole', roleFromParam);
        }
        const maxUser = window.WebApp.initDataUnsafe?.user;
        if (maxUser) {
          try {
            const roleFromParam = startParam?.match(/role=(\w+)/)?.[1] || startParam || undefined;
            const auth = await apiService.authenticateUser(roleFromParam);
            const u = auth?.user;
            if (u) {
              const role = u.role ?? localStorage.getItem('userRole') ?? null;
              const universityId = parseInt(u.university_id ?? localStorage.getItem('universityId') ?? '1', 10);
              const canChangeRole = localStorage.getItem('invitationCodeUsed') === 'true' ? false : true;
              store.dispatch(setUserFromMAX({
                user: { id: u.max_user_id, first_name: u.first_name, last_name: u.last_name, photo_url: u.photo_url, username: u.username },
                role,
                universityId,
                canChangeRole,
              }));
              console.log('User from MAX + backend:', u.first_name, u.last_name, role);
            } else {
              const role = localStorage.getItem('userRole') || null;
              const universityId = parseInt(localStorage.getItem('universityId') || '1', 10);
              store.dispatch(setUserFromMAX({ user: maxUser, role, universityId, canChangeRole: true }));
            }
          } catch (e) {
            console.warn('Auth failed, using init data only', e);
            const role = localStorage.getItem('userRole') || null;
            const universityId = parseInt(localStorage.getItem('universityId') || '1', 10);
            store.dispatch(setUserFromMAX({ user: maxUser, role, universityId, canChangeRole: true }));
          }
        } else {
          const testUserJson = localStorage.getItem('testUser');
          const mockUser = testUserJson ? (() => { try { return JSON.parse(testUserJson); } catch { return null; } })() : null;
          const userToSet = mockUser ?? getMockUserByRole('student');
          const role = localStorage.getItem('userRole') || userToSet?.role || null;
          const universityId = parseInt(localStorage.getItem('universityId') || String(userToSet?.university_id || '1'), 10);
          const canChangeRole = localStorage.getItem('invitationCodeUsed') === 'true' ? false : true;
          store.dispatch(setUserFromMAX({ user: userToSet, role, universityId, canChangeRole }));
          console.log('Mock user synced to Redux:', userToSet?.first_name, userToSet?.last_name);
        }
        console.log('Start params:', startParam);
      } else {
        console.warn('MAX Bridge not available');
      }
    };
    initUser();

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
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route element={<MainLayout />}>
            <Route path="home" element={<MainPage />} />
            <Route path="hub" element={<HubPage />} />
            <Route path="study" element={<StudyGate />} />
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
