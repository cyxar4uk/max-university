import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, Typography } from '@maxhub/max-ui';

const CHANGELOG = [
  {
    version: 'v1.0.2',
    title: 'Bug fix #2',
    items: [
      'Исправлено отображение историй у пользователей',
      'Обновлен профиль пользователя',
      'Добавлена интеграция с внешними мероприятиями',
    ],
  },
  {
    version: 'v1.0.1',
    title: 'Bug fix #1',
    items: [
      'Исправлено отображение историй у пользователей',
      'Обновлен профиль пользователя',
      'Добавлена интеграция с внешними мероприятиями',
    ],
  },
];

const ProfileChangelogPage = () => {
  const navigate = useNavigate();
  return (
    <Panel mode="secondary" className="profile-changelog-page">
      <header className="profile-header-only">
        <button type="button" className="profile-header-back" onClick={() => navigate(-1)} aria-label="Назад">‹</button>
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
