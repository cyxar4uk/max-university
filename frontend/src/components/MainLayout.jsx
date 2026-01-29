import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

/**
 * Layout with bottom navigation: Главная | Хаб | Учёба.
 * Wraps all main app screens after login.
 */
const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isMain = path === '/home' || path === '/';
  const isHub = path === '/hub';
  const isStudy =
    path === '/schedule' ||
    path.startsWith('/courses') ||
    path === '/services' ||
    path === '/payment' ||
    path === '/admission' ||
    path.startsWith('/admission') ||
    path === '/events' ||
    path === '/news';

  const handleNavTo = (route) => {
    if (route === '/home' && path === '/home') return;
    if (route === '/hub' && path === '/hub') return;
    if (route === '/schedule' && isStudy) return;
    navigate(route);
  };

  return (
    <div className="app-container main-layout">
      <main className="main-layout-content">
        <Outlet />
      </main>

      <nav className="bottom-nav bottom-nav-three">
        <button
          className={`nav-item ${isMain ? 'active' : ''}`}
          onClick={() => handleNavTo('/home')}
          aria-label="Главная"
        >
          <span className="nav-icon" aria-hidden>🏠</span>
          <span className="nav-label">Главная</span>
        </button>
        <button
          className={`nav-item ${isHub ? 'active' : ''}`}
          onClick={() => handleNavTo('/hub')}
          aria-label="Хаб"
        >
          <span className="nav-icon" aria-hidden>@</span>
          <span className="nav-label">Хаб</span>
        </button>
        <button
          className={`nav-item ${isStudy ? 'active' : ''}`}
          onClick={() => handleNavTo('/schedule')}
          aria-label="Учёба"
        >
          <span className="nav-icon" aria-hidden>🎓</span>
          <span className="nav-label">Учёба</span>
        </button>
      </nav>
    </div>
  );
};

export default MainLayout;
