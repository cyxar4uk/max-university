import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMAXBridge } from '../useMAXBridge.js';
import { getDisplayUser } from '../utils/displayUser.js';
import UserSwitcher from '../UserSwitcher.jsx';

const roleNames = {
  student: 'Студент',
  applicant: 'Абитуриент',
  employee: 'Сотрудник',
  teacher: 'Учитель',
  admin: 'Администратор',
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const { displayName, avatarUrl } = getDisplayUser(userInfo, user);

  const currentRoleLabel = user.role ? (roleNames[user.role] || user.role) : null;

  return (
    <div className="page profile-page">
      <header className="profile-page-header">
        <button
          type="button"
          className="profile-page-back"
          onClick={() => navigate(-1)}
          aria-label="Назад"
        >
          ‹
        </button>
      </header>

      <div className="profile-page-hero">
        <div className="profile-page-avatar-wrap">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="profile-page-avatar-img" />
          ) : (
            <span className="profile-page-avatar-initial">
              {displayName.charAt(0).toUpperCase() || '👤'}
            </span>
          )}
        </div>
        <h1 className="profile-page-name">{displayName}</h1>
        {currentRoleLabel && (
          <p className="profile-page-role">{currentRoleLabel}</p>
        )}
      </div>

      <div className="profile-page-sections">
        {/* Общая информация */}
        <section className="profile-section">
          <div className="profile-section-header">
            <h2 className="profile-section-title">Общая информация</h2>
            <button
              type="button"
              className="profile-section-action"
              onClick={() => {}}
              aria-label="Изменить"
            >
              Изменить
            </button>
          </div>
          <div className="profile-info-block">
            <div className="profile-info-row">
              <span className="profile-info-label">Университет</span>
              <span className="profile-info-value">РАНХиГС</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Направление</span>
              <span className="profile-info-value">Бизнес-информатика</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Курс</span>
              <span className="profile-info-value">1 курс</span>
            </div>
          </div>
        </section>

        {/* Тестирование / Смена роли */}
        {user.canChangeRole !== false && (
          <section className="profile-section">
            <h2 className="profile-section-title">Тестирование</h2>
            <div className="profile-section-role-row">
              <span className="profile-section-role-current">{currentRoleLabel || '—'}</span>
              <UserSwitcher />
            </div>
          </section>
        )}

        {user.canChangeRole === false && (
          <section className="profile-section profile-section--muted">
            <p className="profile-section-note">
              Вы вошли по коду приглашения. Смена роли недоступна.
            </p>
          </section>
        )}

        {/* Помощь и поддержка */}
        <section className="profile-section">
          <button
            type="button"
            className="profile-section-link"
            onClick={() => {}}
            aria-label="Помощь и поддержка"
          >
            <span>Помощь и поддержка</span>
            <span className="profile-section-link-chevron" aria-hidden>›</span>
          </button>
        </section>

        {/* Что нового */}
        <section className="profile-section">
          <button
            type="button"
            className="profile-section-link profile-section-link--new"
            onClick={() => {}}
            aria-label="Что нового"
          >
            <span>Что нового</span>
            <span className="profile-section-link-dot" aria-hidden />
            <span className="profile-section-link-chevron" aria-hidden>›</span>
          </button>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
