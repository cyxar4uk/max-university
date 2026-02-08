import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Panel, Typography } from '@maxhub/max-ui';
import { useMAXBridge } from '../useMAXBridge.js';
import { getDisplayUser } from '../utils/displayUser.js';

const baseUrl = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
const icon = (name) => `${baseUrl}icons/${name}.svg`;

const roleNames = { student: 'Студент', applicant: 'Абитуриент', employee: 'Сотрудник', teacher: 'Учитель', admin: 'Администратор' };

const CHANGELOG = [
  {
    version: 'v1.0.2',
    title: 'Bug fix #2',
    items: [
      'Исправлено отображение историй пользователей',
      'Обновлен профиль пользователя',
      'Добавлена интеграция с внешними мероприятиями',
    ],
  },
  {
    version: 'v1.0.1',
    title: 'Bug fix #1',
    items: [
      'Исправлено отображение историй пользователей',
      'Обновлен профиль пользователя',
      'Добавлена интеграция с внешними мероприятиями',
    ],
  },
];

const ProfileChangelogPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const { displayName } = getDisplayUser(userInfo, user);
  const currentRoleLabel = user.role ? (roleNames[user.role] || user.role) : '—';

  return (
    <Panel mode="secondary" className="profile-changelog-page">
      <header className="profile-figma-header">
        <button type="button" className="profile-header-back" onClick={() => navigate(-1)} aria-label="Назад">‹</button>
        <div className="profile-figma-header-center">
          <Typography.Headline variant="small" className="profile-figma-header-name">{displayName}</Typography.Headline>
          <Typography.Body variant="small" className="profile-figma-header-role">{currentRoleLabel}</Typography.Body>
        </div>
        <div className="profile-figma-header-right">
          <img src={icon('iconsettings')} alt="" width={20} height={20} aria-hidden />
          <Typography.Action variant="small" className="profile-figma-header-label">Настройки / Что нового</Typography.Action>
        </div>
      </header>
      <div className="profile-changelog-content">
        <Typography.Headline variant="medium" className="profile-changelog-title">Что нового</Typography.Headline>
        {CHANGELOG.map((release) => (
          <div key={release.version} className="profile-changelog-card">
            <Typography.Body variant="medium-strong" className="profile-changelog-version">
              {release.version} {release.title}
            </Typography.Body>
            <ul className="profile-changelog-list">
              {release.items.map((item, i) => (
                <li key={i}><Typography.Body variant="small">{item}</Typography.Body></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
};

export default ProfileChangelogPage;
