import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import WelcomePage from '../pages/WelcomePage.jsx';

/**
 * При входе в раздел «Учёба»: если у пользователя нет роли (код приглашения не введён),
 * показываем ввод кода приглашения; иначе переходим в расписание.
 */
const StudyGate = () => {
  const location = useLocation();
  const user = useSelector((state) => state.user);
  const hasRole =
    user?.role ||
    typeof window !== 'undefined' && localStorage.getItem('userRole');

  if (hasRole) {
    return <Navigate to="/schedule" replace state={{ from: location.pathname }} />;
  }

  return <WelcomePage returnTo="/schedule" />;
};

export default StudyGate;
