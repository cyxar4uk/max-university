import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUserFromMAX } from './userSlice';
import apiService from './api-service';
import { getMockUserByRole } from './mockUsers';

const WelcomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        // 1. Получаем роль из URL параметров
        let role = searchParams.get('role') || 'student';
        let universityId = parseInt(searchParams.get('university_id') || '1');

        // 2. Проверяем, есть ли тестовый пользователь в localStorage
        const testUser = localStorage.getItem('testUser');
        let userInfo;

        if (testUser) {
          userInfo = JSON.parse(testUser);
          role = userInfo.role;
          universityId = userInfo.university_id;
        } else {
          // 3. Получаем данные пользователя из MAX Bridge или используем мок
          if (window.WebApp && window.WebApp.initDataUnsafe?.user) {
            userInfo = window.WebApp.initDataUnsafe.user;
          } else {
            // Используем тестового пользователя
            userInfo = getMockUserByRole(role);
          }
        }

        // 4. Аутентифицируем пользователя на бэкенде (или используем мок)
        try {
          await apiService.authenticateUser();
        } catch (error) {
          console.warn('Backend authentication failed, using mock mode');
        }

        // 5. Устанавливаем роль
        try {
          await apiService.setUserRole(role, universityId);
        } catch (error) {
          console.warn('Set role failed, using mock mode');
        }

        // 6. Сохраняем в Redux
        dispatch(setUserFromMAX({
          user: userInfo,
          role: role,
          universityId: universityId
        }));

        // 7. Сохраняем в localStorage
        localStorage.setItem('userRole', role);
        localStorage.setItem('universityId', String(universityId));
        localStorage.setItem('maxUserId', String(userInfo.id));

        // 8. Переходим на главную страницу
        setLoading(false);
        navigate('/home', { replace: true });

      } catch (err) {
        console.error('Initialization error:', err);
        setLoading(false);
        navigate('/home', { replace: true });
      }
    };

    initializeUser();
  }, [searchParams, dispatch, navigate]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Инициализация приложения...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default WelcomePage;

