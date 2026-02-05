import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUserFromMAX } from '../userSlice.js';
import apiService from '../api-service.js';
import { getMockUserByRole } from '../mockUsers.js';

const WelcomePage = ({ returnTo }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(!returnTo);
  const [showInvitationForm, setShowInvitationForm] = useState(!!returnTo);
  const [invitationCode, setInvitationCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [processingCode, setProcessingCode] = useState(false);
  const [selectingRole, setSelectingRole] = useState(false);

  const goAfterSuccess = returnTo || '/home';

  useEffect(() => {
    if (returnTo) {
      setLoading(false);
      setShowInvitationForm(true);
      return;
    }
    const initializeUser = async () => {
      try {
        const codeFromUrl = searchParams.get('code');
        if (codeFromUrl) {
          await handleInvitationCode(codeFromUrl);
          return;
        }
        const roleFromUrl = searchParams.get('role');
        if (roleFromUrl) {
          await initializeWithRole(roleFromUrl);
          return;
        }
        const testUser = localStorage.getItem('testUser');
        if (testUser) {
          const userInfo = JSON.parse(testUser);
          await initializeWithRole(userInfo.role, userInfo.university_id);
          return;
        }
        setShowInvitationForm(true);
        setLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setLoading(false);
        setShowInvitationForm(true);
      }
    };
    initializeUser();
  }, [searchParams, dispatch, navigate, returnTo]);

  const initializeWithRole = async (role, universityId = 1) => {
    setSelectingRole(true);
    let userInfo;

    // Получаем данные пользователя из MAX Bridge или используем мок
    if (window.WebApp && window.WebApp.initDataUnsafe?.user) {
      userInfo = window.WebApp.initDataUnsafe.user;
    } else {
      // Используем тестового пользователя
      userInfo = getMockUserByRole(role);
    }

    // Аутентифицируем пользователя на бэкенде (или используем мок)
    try {
      await apiService.authenticateUser();
    } catch (error) {
      console.warn('Backend authentication failed, using mock mode');
    }

    // Устанавливаем роль
    try {
      await apiService.setUserRole(role, universityId);
    } catch (error) {
      console.warn('Set role failed, using mock mode');
    }

    // Сохраняем в Redux
    dispatch(setUserFromMAX({
      user: userInfo,
      role: role,
      universityId: universityId
    }));

    // Сохраняем в localStorage
    localStorage.setItem('userRole', role);
    localStorage.setItem('universityId', String(universityId));
    localStorage.setItem('maxUserId', String(userInfo.id));

    navigate(goAfterSuccess, { replace: true });
  };

  const handleRoleSelect = async (role) => {
    try {
      await initializeWithRole(role);
    } finally {
      setSelectingRole(false);
    }
  };

  const handleInvitationCode = async (code) => {
    setProcessingCode(true);
    setCodeError('');

    try {
      const result = await apiService.useInvitationCode(code);
      
      // Получаем данные пользователя
      let userInfo;
      if (window.WebApp && window.WebApp.initDataUnsafe?.user) {
        userInfo = window.WebApp.initDataUnsafe.user;
      } else {
        userInfo = getMockUserByRole(result.role);
      }

      // Аутентифицируем пользователя
      try {
        await apiService.authenticateUser();
      } catch (error) {
        console.warn('Backend authentication failed, using mock mode');
      }

      // Сохраняем в Redux
      dispatch(setUserFromMAX({
        user: userInfo,
        role: result.role,
        universityId: result.university_id
      }));

      // Сохраняем в localStorage
      localStorage.setItem('userRole', result.role);
      localStorage.setItem('universityId', String(result.university_id));
      localStorage.setItem('maxUserId', String(userInfo.id));
      localStorage.setItem('invitationCodeUsed', 'true');

      navigate(goAfterSuccess || '/home', { replace: true });

    } catch (error) {
      console.error('Invitation code error:', error);
      setCodeError('Неверный или истекший код приглашения');
      setProcessingCode(false);
    }
  };

  const handleSubmitCode = (e) => {
    e.preventDefault();
    if (invitationCode.trim()) {
      handleInvitationCode(invitationCode.trim());
    } else {
      setCodeError('Введите код приглашения');
    }
  };

  // Тестовый код для демонстрации
  const handleTestCode = () => {
    setInvitationCode('TEST-CODE-123');
    handleInvitationCode('TEST-CODE-123');
  };

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

  if (showInvitationForm) {
    return (
      <div className="page">
        <div className="welcome-container">
          <h1 className="welcome-title">🎓 Цифровой университет</h1>
          <p className="welcome-subtitle">Введите код приглашения для входа в цифровое пространство вашего университета</p>

          <div className="welcome-role-section">
            <p className="welcome-role-title">Выберите роль для входа:</p>
            <div className="welcome-role-grid">
              {[
                { key: 'parent', label: 'Родитель' },
                { key: 'student', label: 'Студент' },
                { key: 'employee', label: 'Сотрудник' },
                { key: 'teacher', label: 'Преподаватель' },
              ].map((role) => (
                <button
                  key={role.key}
                  type="button"
                  className="welcome-role-button"
                  onClick={() => handleRoleSelect(role.key)}
                  disabled={selectingRole || processingCode}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
          
          <form onSubmit={handleSubmitCode} className="invitation-form">
            <div className="form-group">
              <label htmlFor="invitationCode" className="form-label">Код приглашения</label>
              <input
                id="invitationCode"
                type="text"
                value={invitationCode}
                onChange={(e) => {
                  setInvitationCode(e.target.value.toUpperCase());
                  setCodeError('');
                }}
                placeholder="Введите код"
                className={`form-input ${codeError ? 'error' : ''}`}
                disabled={processingCode}
                autoFocus
              />
              {codeError && (
                <p className="form-error">{codeError}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={processingCode || !invitationCode.trim()}
            >
              {processingCode ? 'Проверка...' : 'Войти'}
            </button>
          </form>

          <div className="test-code-section">
            <p className="test-code-label">Для тестирования:</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestCode}
              disabled={processingCode}
            >
              Использовать тестовый код
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default WelcomePage;
