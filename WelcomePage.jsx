import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Panel,
  PanelHeader,
  Group,
  Div,
  Title,
  Text,
  Spinner
} from '@vkontakte/vkui';
import { useMAXBridge } from './useMAXBridge';
import { useDispatch } from 'react-redux';
import { setUserFromMAX, setRole } from './userSlice';
import apiService from './api-service';

/**
 * WelcomePage - Страница приветствия и авторизации
 * 
 * ВАЖНО: Выбор роли происходит в чат-боте MAX через inline кнопки!
 * Mini-app получает роль через параметры запуска.
 */
const WelcomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { userInfo, launchParams, isInitialized } = useMAXBridge();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isInitialized) return;

    const initializeUser = async () => {
      try {
        // 1. Получаем роль из параметров запуска
        // Роль передаётся из бота через URL: ?startapp=student_1
        // Где student - роль, 1 - ID университета
        let role = null;
        let universityId = null;

        if (launchParams) {
          const params = launchParams.split('_');
          role = params[0];
          universityId = params[1] ? parseInt(params[1]) : 1;
        }

        // Также проверяем URL параметры (на случай прямого открытия)
        if (!role) {
          role = searchParams.get('role');
          universityId = searchParams.get('university_id') 
            ? parseInt(searchParams.get('university_id')) 
            : 1;
        }

        // 2. Если роли нет - показываем сообщение
        if (!role || !['student', 'applicant', 'employee', 'admin'].includes(role)) {
          setError('Пожалуйста, выберите роль через чат-бота');
          setLoading(false);
          return;
        }

        // 3. Если нет данных пользователя от MAX - ошибка
        if (!userInfo) {
          setError('Не удалось получить данные пользователя от MAX');
          setLoading(false);
          return;
        }

        // 4. Аутентифицируем пользователя на бэкенде
        const authResult = await apiService.authenticateUser();
        
        // 5. Устанавливаем роль если она есть
        if (role) {
          await apiService.setUserRole(role, universityId);
        }

        // 6. Сохраняем в Redux
        dispatch(setUserFromMAX({
          user: userInfo,
          role: role,
          universityId: universityId
        }));

        // 7. Сохраняем в localStorage (для персистентности)
        localStorage.setItem('userRole', role);
        localStorage.setItem('universityId', String(universityId));
        localStorage.setItem('maxUserId', String(userInfo.id));

        // 8. Переходим на главную страницу
        setLoading(false);
        navigate('/home', { replace: true });

      } catch (err) {
        console.error('Initialization error:', err);
        setError('Ошибка при инициализации. Попробуйте перезапустить приложение');
        setLoading(false);
      }
    };

    initializeUser();
  }, [isInitialized, userInfo, launchParams, searchParams, dispatch, navigate]);

  // Состояние загрузки
  if (loading) {
    return (
      <Panel id="welcome">
        <PanelHeader>Цифровой университет</PanelHeader>
        <Group>
          <Div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '50vh' 
          }}>
            <Spinner size="large" />
            <Text style={{ marginTop: 16 }}>
              Загрузка...
            </Text>
          </Div>
        </Group>
      </Panel>
    );
  }

  // Состояние ошибки
  if (error) {
    return (
      <Panel id="welcome">
        <PanelHeader>Цифровой университет</PanelHeader>
        <Group>
          <Div>
            <Title level="2" weight="bold" style={{ marginBottom: 16, color: '#E64646' }}>
              ⚠️ Ошибка
            </Title>
            <Text style={{ marginBottom: 24 }}>
              {error}
            </Text>
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '8px',
              marginBottom: 16
            }}>
              <Text weight="medium" style={{ marginBottom: 8 }}>
                Как исправить:
              </Text>
              <Text style={{ marginBottom: 8 }}>
                1. Закройте это приложение
              </Text>
              <Text style={{ marginBottom: 8 }}>
                2. Откройте чат-бота "Цифровой университет"
              </Text>
              <Text style={{ marginBottom: 8 }}>
                3. Нажмите /start
              </Text>
              <Text>
                4. Выберите свою роль через кнопки
              </Text>
            </div>
            <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
              После выбора роли приложение откроется автоматически
            </Text>
          </Div>
        </Group>
      </Panel>
    );
  }

  return null;
};

export default WelcomePage;