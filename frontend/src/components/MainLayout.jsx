import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Typography } from '@maxhub/max-ui';

const baseUrl = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
const icon = (name) => `${baseUrl}icons/${name}.svg`;

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
    path === '/study' ||
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
    if (route === '/study' && isStudy) return;
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
          <span className="nav-icon nav-icon-svg" aria-hidden>
            <img src={icon('iconhome')} alt="" width={24} height={24} />
          </span>
          <Typography.Action variant="small" className="nav-label">Главная</Typography.Action>
        </button>
        <button
          className={`nav-item ${isHub ? 'active' : ''}`}
          onClick={() => handleNavTo('/hub')}
          aria-label="Хаб"
        >
          <span className="nav-icon nav-icon-svg" aria-hidden>
            <img src={icon('iconhub')} alt="" width={24} height={24} />
          </span>
          <Typography.Action variant="small" className="nav-label">Хаб</Typography.Action>
        </button>
        <button
          className={`nav-item ${isStudy ? 'active' : ''}`}
          onClick={() => handleNavTo('/study')}
          aria-label="Учёба"
        >
          <span className="nav-icon nav-icon-svg" aria-hidden>
            <img src={icon('iconedu')} alt="" width={24} height={24} />
          </span>
          <Typography.Action variant="small" className="nav-label">Учёба</Typography.Action>
        </button>
      </nav>
    </div>
  );
};

export default MainLayout;
