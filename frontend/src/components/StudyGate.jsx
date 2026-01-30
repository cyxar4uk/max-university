import React from 'react';
import { useSelector } from 'react-redux';
import WelcomePage from '../pages/WelcomePage.jsx';
import HomePage from '../pages/HomePage.jsx';

/**
 * При входе в раздел «Учёба»: если у пользователя нет роли (код приглашения не введён),
 * показываем ввод кода приглашения; иначе показываем старую главную (виджеты по ролям, расписание, услуги и т.д.).
 */
const StudyGate = () => {
  const user = useSelector((state) => state.user);
  const hasRole =
    user?.role ||
    (typeof window !== 'undefined' && localStorage.getItem('userRole'));

  if (!hasRole) {
    return <WelcomePage returnTo="/study" />;
  }

  return <HomePage />;
};

export default StudyGate;
