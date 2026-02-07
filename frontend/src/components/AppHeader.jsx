import React from 'react';
import { Avatar, Typography } from '@maxhub/max-ui';

/**
 * Единый хедер приложения (Главная, Хаб и др.).
 * MAX UI: Avatar, Typography. Слева: аватар + опционально приветствие. В центре: опциональный контент. Справа: кнопка поиска или другая.
 */
const AppHeader = ({
  displayName,
  avatarUrl,
  onProfileClick,
  variant = 'main', // 'main' | 'hub'
  greeting,
  firstName,
  centerContent,
  rightContent,
  className = '',
}) => {
  const isMain = variant === 'main';
  const initial = (displayName || 'П').charAt(0).toUpperCase();

  return (
    <header className={`app-header app-header--white ${className}`.trim()} role="banner">
      <div className="app-header__inner">
        <button
          type="button"
          className="app-header__left"
          onClick={onProfileClick}
          aria-label="Профиль"
        >
          <span className="app-header__avatar app-header__avatar--max-ui">
            <Avatar.Container size={40} form="circle">
              {avatarUrl ? (
                <Avatar.Image src={avatarUrl} fallback={initial} alt="" />
              ) : (
                <Avatar.Text gradient="blue">{initial}</Avatar.Text>
              )}
            </Avatar.Container>
          </span>
          {isMain && greeting != null && (
            <div className="app-header__greeting-block">
              <Typography.Body variant="small" className="app-header__greeting-line">
                {greeting},
              </Typography.Body>
              <Typography.Title variant="small" className="app-header__greeting-name">
                {firstName ?? (displayName || '').split(' ')[0]}
              </Typography.Title>
            </div>
          )}
        </button>

        {centerContent && <div className="app-header__center">{centerContent}</div>}

        <div className="app-header__right">
          {rightContent}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
