import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMAXBridge } from './useMAXBridge.v2';
import apiService from './api-service';
import UserSwitcher from './UserSwitcher';

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const [sections, setSections] = useState([]);
  const [university, setUniversity] = useState(null);
  const [headerColor, setHeaderColor] = useState('#0088CC');
  const [loading, setLoading] = useState(true);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [activeNavTab, setActiveNavTab] = useState('main');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const role = user.role || localStorage.getItem('userRole') || 'student';
        const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');

        const config = await apiService.getBlocksConfig(universityId, role);
        
        if (config.sections && config.sections.length > 0) {
          setSections(config.sections);
          setUniversity(config.university_name);
          if (config.header_color) {
            setHeaderColor(config.header_color);
            document.documentElement.style.setProperty('--max-primary', config.header_color);
          }
        } else {
          // Fallback
          const defaultBlocks = {
            student: ["profile", "schedule", "lms", "services", "life"],
            applicant: ["profile", "news", "admission", "payment"],
            employee: ["profile", "schedule", "services", "news"],
            admin: ["profile", "analytics", "config", "users"]
          };
          setSections([{
            id: 1,
            name: "Главное",
            blocks: (defaultBlocks[role] || defaultBlocks.student).map((bt, idx) => ({
              id: idx + 1,
              block_type: bt,
              name: getBlockName(bt),
              order_index: idx
            }))
          }]);
          setUniversity("Российская академия народного хозяйства");
        }
      } catch (error) {
        console.error('Error loading config:', error);
        const defaultBlocks = {
          student: ["profile", "schedule", "lms", "services", "life"],
          applicant: ["profile", "news", "admission", "payment"],
          employee: ["profile", "schedule", "services", "news"],
          admin: ["profile", "analytics", "config", "users"]
        };
        const role = user.role || localStorage.getItem('userRole') || 'student';
        setSections([{
          id: 1,
          name: "Главное",
          blocks: (defaultBlocks[role] || defaultBlocks.student).map((bt, idx) => ({
            id: idx + 1,
            block_type: bt,
            name: getBlockName(bt),
            order_index: idx
          }))
        }]);
        setUniversity("Российская академия народного хозяйства");
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [user.role, user.universityId]);

  const getBlockIcon = (blockType) => {
    const icons = {
      profile: '👤',
      schedule: '📅',
      lms: '📚',
      services: '📝',
      life: '🎉',
      payment: '💳',
      news: '📰',
      admission: '📄',
      analytics: '📊',
      config: '⚙️',
      users: '👥',
    };
    return icons[blockType] || '📋';
  };

  const getBlockName = (blockType) => {
    const names = {
      profile: 'Профиль',
      schedule: 'Расписание',
      lms: 'Учебные материалы',
      services: 'Услуги',
      life: 'Внеучебная жизнь',
      payment: 'Оплата',
      news: 'Новости',
      admission: 'Поступление',
      analytics: 'Аналитика',
      config: 'Настройки',
      users: 'Пользователи',
    };
    return names[blockType] || blockType;
  };

  const getBlockRoute = (blockType) => {
    const routes = {
      profile: '/profile',
      schedule: '/schedule',
      lms: '/courses',
      services: '/services',
      life: '/events',
      payment: '/payment',
      news: '/news',
      admission: '/admission',
      analytics: '/admin',
      config: '/admin',
      users: '/admin',
    };
    return routes[blockType] || '/home';
  };

  const getRoleName = (role) => {
    const names = {
      student: 'Студент',
      applicant: 'Абитуриент',
      employee: 'Сотрудник',
      admin: 'Администратор'
    };
    return names[role] || role;
  };

  const handleBlockClick = (blockType) => {
    const route = getBlockRoute(blockType);
    navigate(route);
  };

  const handleDigitalPass = () => {
    // Открыть цифровой пропуск
    navigate('/profile');
  };

  const handleNavClick = (tab) => {
    setActiveNavTab(tab);
    if (tab === 'main') {
      navigate('/home');
    } else if (tab === 'section1') {
      // Переключение на первый раздел
      if (sections.length > 0) {
        setActiveSectionIndex(0);
      }
    } else if (tab === 'section2') {
      // Переключение на второй раздел
      if (sections.length > 1) {
        setActiveSectionIndex(1);
      }
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  const currentSection = sections[activeSectionIndex] || sections[0];
  const currentUser = userInfo || user;
  const userAvatar = currentUser?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((currentUser?.first_name || 'User') + ' ' + (currentUser?.last_name || ''))}&background=${headerColor.replace('#', '')}&color=fff`;

  return (
    <div className="app-container">
      {/* Хедер */}
      <header className="main-header" style={{ background: headerColor }}>
        <div className="header-top">
          <button className="digital-pass-btn" onClick={handleDigitalPass}>
            цифровой пропуск
          </button>
          <div className="header-user-info">
            <div className="header-university">{university || 'Университет'}</div>
            <div className="header-role">{getRoleName(user.role || 'student')}</div>
          </div>
          <div className="header-avatar">
            <img src={userAvatar} alt="Avatar" />
          </div>
        </div>
      </header>

      {/* Контент */}
      <main className="main-content">
        {sections.length > 0 && currentSection && (
          <>
            {/* Блок 1 - Большой блок */}
            {currentSection.blocks.length > 0 && (
              <div className="content-block block-large">
                <div 
                  className="block-item large-block"
                  onClick={() => handleBlockClick(currentSection.blocks[0].block_type)}
                >
                  <div className="block-icon">{getBlockIcon(currentSection.blocks[0].block_type)}</div>
                  <div className="block-title">{currentSection.blocks[0].name}</div>
                </div>
              </div>
            )}

            {/* Блок 2 - Большой блок */}
            {currentSection.blocks.length > 1 && (
              <div className="content-block block-large">
                <div 
                  className="block-item large-block"
                  onClick={() => handleBlockClick(currentSection.blocks[1].block_type)}
                >
                  <div className="block-icon">{getBlockIcon(currentSection.blocks[1].block_type)}</div>
                  <div className="block-title">{currentSection.blocks[1].name}</div>
                </div>
              </div>
            )}

            {/* Карусель блоков (блок 3 и далее) */}
            {currentSection.blocks.length > 2 && (
              <div className="content-block block-carousel">
                <div className="carousel-container">
                  {currentSection.blocks.slice(2).map((block) => (
                    <div
                      key={block.id}
                      className="block-item carousel-item"
                      onClick={() => handleBlockClick(block.block_type)}
                    >
                      <div className="block-icon">{getBlockIcon(block.block_type)}</div>
                      <div className="block-title">{block.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Блок 4 - Большой блок (если есть) */}
            {currentSection.blocks.length > 4 && (
              <div className="content-block block-large">
                <div 
                  className="block-item large-block"
                  onClick={() => handleBlockClick(currentSection.blocks[4].block_type)}
                >
                  <div className="block-icon">{getBlockIcon(currentSection.blocks[4].block_type)}</div>
                  <div className="block-title">{currentSection.blocks[4].name}</div>
                </div>
              </div>
            )}
          </>
        )}

        {sections.length === 0 && (
          <div className="empty-state">
            <p>Нет доступных блоков для вашей роли</p>
          </div>
        )}
      </main>

      {/* Навигационное меню внизу */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeNavTab === 'main' ? 'active' : ''}`}
          onClick={() => handleNavClick('main')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Главное</span>
        </button>
        <button 
          className={`nav-item ${activeNavTab === 'section1' ? 'active' : ''}`}
          onClick={() => handleNavClick('section1')}
          disabled={sections.length === 0}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">{sections[0]?.name || 'Раздел 1'}</span>
        </button>
        <button 
          className={`nav-item ${activeNavTab === 'section2' ? 'active' : ''}`}
          onClick={() => handleNavClick('section2')}
          disabled={sections.length < 2}
        >
          <span className="nav-icon">📄</span>
          <span className="nav-label">{sections[1]?.name || 'Раздел 2'}</span>
        </button>
        {user.role === 'admin' && (
          <button 
            className={`nav-item ${activeNavTab === 'admin' ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Админ</span>
          </button>
        )}
      </nav>

      <UserSwitcher />
    </div>
  );
};

export default HomePage;
