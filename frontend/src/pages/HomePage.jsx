import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMAXBridge } from '../useMAXBridge.js';
import apiService from '../api-service.js';
import BlockWidget from '../Widgets/BlockWidget.jsx';
import DigitalPassWidget from '../Widgets/DigitalPassWidget.jsx';

const HomePage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const [sections, setSections] = useState([]);
  const [university, setUniversity] = useState(null);
  const [headerColor, setHeaderColor] = useState('#0088CC');
  const [loading, setLoading] = useState(true);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [showDigitalPass, setShowDigitalPass] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const role = user.role || localStorage.getItem('userRole') || 'student';
        const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');

        const config = await apiService.getBlocksConfig(universityId, role);
        
        if (config.sections && config.sections.length > 0) {
          // Фильтруем профиль из блоков
          const filteredSections = config.sections.map(section => ({
            ...section,
            blocks: section.blocks.filter(block => block.block_type !== 'profile')
          }));
          setSections(filteredSections);
          setUniversity(config.university_name);
          if (config.header_color) {
            setHeaderColor(config.header_color);
            document.documentElement.style.setProperty('--max-primary', config.header_color);
          }
        } else {
          // Fallback
          const defaultBlocks = {
            student: ["schedule", "lms", "services", "life", "news"],
            applicant: ["news", "admission", "payment"],
            employee: ["schedule", "services", "news"],
            admin: ["analytics", "config", "users"]
          };
          const getBlockName = (bt) => {
            const names = {
              schedule: 'Расписание',
              lms: 'Учебные материалы',
              services: 'Услуги',
              life: 'Внеучебная жизнь',
              news: 'Новости',
              admission: 'Поступление',
              payment: 'Оплата',
              analytics: 'Аналитика',
              config: 'Настройки',
              users: 'Пользователи',
            };
            return names[bt] || bt;
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
          student: ["schedule", "lms", "services", "life", "news"],
          applicant: ["news", "admission", "payment"],
          employee: ["schedule", "services", "news"],
          admin: ["analytics", "config", "users"]
        };
        const role = user.role || localStorage.getItem('userRole') || 'student';
        const getBlockName = (bt) => {
          const names = {
            schedule: 'Расписание',
            lms: 'Учебные материалы',
            services: 'Услуги',
            life: 'Внеучебная жизнь',
            news: 'Новости',
            admission: 'Поступление',
            payment: 'Оплата',
            analytics: 'Аналитика',
            config: 'Настройки',
            users: 'Пользователи',
          };
          return names[bt] || bt;
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
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [user.role, user.universityId]);

  const getRoleName = (role) => {
    const names = {
      student: 'Студент',
      applicant: 'Абитуриент',
      employee: 'Сотрудник',
      admin: 'Администратор'
    };
    return names[role] || role;
  };

  const handleDigitalPass = () => {
    setShowDigitalPass(true);
  };

  const handleProfileClick = () => {
    navigate('/profile');
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
          <div 
            className="header-avatar"
            onClick={handleProfileClick}
            style={{ cursor: 'pointer' }}
          >
            <img src={userAvatar} alt="Avatar" />
          </div>
        </div>
      </header>

      {/* Контент */}
      <main className="main-content">
        {sections.length > 0 && currentSection && currentSection.blocks.length > 0 ? (
          <div className="widgets-container">
            {currentSection.blocks.map((block) => (
              <BlockWidget key={block.id} block={block} apiService={apiService} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Нет доступных блоков для вашей роли</p>
          </div>
        )}
      </main>

      {/* Модальное окно цифрового пропуска */}
      {showDigitalPass && (
        <div className="modal-overlay" onClick={() => setShowDigitalPass(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowDigitalPass(false)}
            >
              ×
            </button>
            <DigitalPassWidget />
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;
