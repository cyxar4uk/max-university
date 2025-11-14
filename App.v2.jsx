import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import './styles.css';

// Pages
import WelcomePage from './WelcomePage.v2';
import HomePage from './HomePage.v2';
import ProfilePage from './ProfilePage.v2';
import SchedulePage from './SchedulePage.v2';
import CoursesPage from './CoursesPage.v2';
import AdminPage from './AdminPage.v2';
import ServicesPage from './ServicesPage.v2';
import EventsPage from './EventsPage.v2';
import NewsPage from './NewsPage.v2';
import PaymentPage from './PaymentPage.v2';
import AdmissionPage from './AdmissionPage.v2';

function App() {
  useEffect(() => {
    // Инициализация MAX Bridge
    if (window.WebApp) {
      window.WebApp.ready();
      console.log('MAX Bridge initialized');
      console.log('User:', window.WebApp.initDataUnsafe?.user);
      console.log('Start params:', window.WebApp.initDataUnsafe?.start_param);
    } else {
      console.warn('MAX Bridge not available, using mock mode');
    }
  }, []);

  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/courses" element={<CoursesPage />} />
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

