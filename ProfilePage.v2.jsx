import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import UserSwitcher from './UserSwitcher';

const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);

  const roleNames = {
    student: 'Студент',
    applicant: 'Абитуриент',
    employee: 'Сотрудник',
    admin: 'Администратор'
  };

  return (
    <div className="page">
      <div className="page-header">
        <button 
          onClick={() => navigate('/home')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            marginRight: '12px'
          }}
        >
          ←
        </button>
        <h1 className="page-title">👤 Профиль</h1>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div className="profile-avatar">
          {user.firstName?.charAt(0) || '👤'}
        </div>
        <h2 className="profile-name">
          {user.firstName || 'Пользователь'} {user.lastName || ''}
        </h2>
        {user.role && (
          <p className="profile-role">
            {roleNames[user.role] || user.role}
          </p>
        )}
      </div>

      <div className="card">
        <p className="card-title">ID пользователя</p>
        <p className="card-text">{user.maxUserId}</p>
      </div>

      {user.username && (
        <div className="card">
          <p className="card-title">Username</p>
          <p className="card-text">@{user.username}</p>
        </div>
      )}

      <div className="card">
        <p className="card-title">Язык</p>
        <p className="card-text">{user.languageCode || 'ru'}</p>
      </div>

      <div className="card">
        <p className="card-title">Университет</p>
        <p className="card-text">Российская академия народного хозяйства</p>
      </div>

      <UserSwitcher />
    </div>
  );
};

export default ProfilePage;

