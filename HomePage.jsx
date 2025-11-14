import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Panel,
  PanelHeader,
  Group,
  Div,
  Title,
  Card,
  CardGrid,
  Text,
  Button,
  Avatar
} from '@vkontakte/vkui';
import {
  Icon28UserOutline,
  Icon28CalendarOutline,
  Icon28BookOutline,
  Icon28DocumentOutline,
  Icon28NewsfeedOutline,
  Icon28MoneyCircleOutline,
  Icon28Users3Outline,
  Icon28ChartOutline,
  Icon28SettingsOutline,
  Icon28WorkOutline
} from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';
import { useSelector } from 'react-redux';
import apiService from './api-service';

const HomePage = () => {
  const navigate = useNavigate();
  const { userInfo, showBackButton, hideBackButton, onBackButtonClick } = useMAXBridge();
  const user = useSelector((state) => state.user);
  const [blocks, setBlocks] = useState([]);
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    showBackButton();
    onBackButtonClick(() => {
      navigate('/');
    });

    return () => {
      hideBackButton();
    };
  }, [navigate, showBackButton, hideBackButton, onBackButtonClick]);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        const role = user.role || localStorage.getItem('userRole');
        const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');

        if (role && universityId) {
          // Получаем конфигурацию блоков для роли
          const config = await apiService.getBlocksConfig(universityId, role);
          setBlocks(config.blocks || []);
          setUniversity(config.university_name);
        }
      } catch (error) {
        console.error('Error loading blocks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBlocks();
  }, [user.role, user.universityId]);

  const blockIcons = {
    profile: <Icon28UserOutline />,
    schedule: <Icon28CalendarOutline />,
    lms: <Icon28BookOutline />,
    services: <Icon28DocumentOutline />,
    life: <Icon28NewsfeedOutline />,
    payment: <Icon28MoneyCircleOutline />,
    news: <Icon28NewsfeedOutline />,
    admission: <Icon28Users3Outline />,
    analytics: <Icon28ChartOutline />,
    config: <Icon28SettingsOutline />,
    users: <Icon28Users3Outline />,
    all_blocks: <Icon28SettingsOutline />
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
      <Panel>
        <PanelHeader>Загрузка...</PanelHeader>
        <Group>
          <Div>
            <Text>Загрузка блоков...</Text>
          </Div>
        </Group>
      </Panel>
    );
  }

  return (
    <Panel id="home">
      <PanelHeader>
        {university || 'Цифровой университет'}
      </PanelHeader>
      <Group>
        <Div>
          {userInfo && (
            <div style={{ 
              marginBottom: 16, 
              padding: 12, 
              backgroundColor: 'var(--vkui--color_background_secondary)', 
              borderRadius: 8 
            }}>
              <Text weight="medium">
                Привет, {userInfo.first_name}! 👋
              </Text>
              {user.role && (
                <Text style={{ marginTop: 4, color: 'var(--vkui--color_text_secondary)' }}>
                  Роль: {user.role}
                </Text>
              )}
            </div>
          )}

          <Title level="2" weight="bold" style={{ marginBottom: 16 }}>
            Доступные разделы
          </Title>

          <CardGrid size="l">
            {blocks.map((blockId) => (
              <Card
                key={blockId}
                mode="shadow"
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onClick={() => handleBlockClick(blockId)}
              >
                <Div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <Avatar size={40} style={{ backgroundColor: 'var(--vkui--color_background_accent)' }}>
                      {blockIcons[blockId] || <Icon28DocumentOutline />}
                    </Avatar>
                    <Title level="3" weight="medium" style={{ marginLeft: 12 }}>
                      {blockNames[blockId] || blockId}
                    </Title>
                  </div>
                </Div>
              </Card>
            ))}
          </CardGrid>

          {blocks.length === 0 && (
            <Div>
              <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                Нет доступных блоков для вашей роли
              </Text>
            </Div>
          )}
        </Div>
      </Group>
    </Panel>
  );
};

export default HomePage;
