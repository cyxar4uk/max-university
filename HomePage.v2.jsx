import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiService from './api-service';
import UserSwitcher from './UserSwitcher';

const HomePage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [blocks, setBlocks] = useState([]);
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        const role = user.role || localStorage.getItem('userRole') || 'student';
        const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');

        // Получаем конфигурацию блоков для роли
        const config = await apiService.getBlocksConfig(universityId, role);
        setBlocks(config.blocks || []);
        setUniversity(config.university_name);
      } catch (error) {
        console.error('Error loading blocks:', error);
        // Используем дефолтные блоки при ошибке
        const defaultBlocks = {
          student: ["profile", "schedule", "lms", "services", "life"],
          applicant: ["profile", "news", "admission", "payment"],
          employee: ["profile", "schedule", "services", "news"],
          admin: ["profile", "analytics", "config", "users", "all_blocks"]
        };
        const role = user.role || localStorage.getItem('userRole') || 'student';
        setBlocks(defaultBlocks[role] || defaultBlocks.student);
        setUniversity("Российская академия народного хозяйства");
      } finally {
        setLoading(false);
      }
    };

    loadBlocks();
  }, [user.role, user.universityId]);

  const blockIcons = {
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
    all_blocks: '🎛️'
  };

  const blockNames = {
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
    all_blocks: 'Все блоки'
  };

  const blockRoutes = {
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
    all_blocks: '/admin'
  };

  const handleBlockClick = (blockId) => {
    const route = blockRoutes[blockId];
    if (route) {
      navigate(route);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Загрузка...</h1>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка блоков...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{university || 'Цифровой университет'}</h1>
      </div>

      <div className="info-box">
        <p>
          <strong>👋 Привет, {user.firstName || 'Пользователь'}!</strong>
        </p>
        {user.role && (
          <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--max-text-secondary)' }}>
            Роль: {blockNames[user.role] || user.role}
          </p>
        )}
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Доступные разделы</h2>

      <div className="grid">
        {blocks.map((blockId) => (
          <div
            key={blockId}
            className="role-card"
            onClick={() => handleBlockClick(blockId)}
          >
            <div className="role-icon">{blockIcons[blockId] || '📋'}</div>
            <div className="role-title">{blockNames[blockId] || blockId}</div>
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="card">
          <p className="card-text">Нет доступных блоков для вашей роли</p>
        </div>
      )}

      <UserSwitcher />
    </div>
  );
};

export default HomePage;

