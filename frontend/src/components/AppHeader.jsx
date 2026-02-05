import React from 'react';

/**
 * Единый хедер приложения (Главная, Хаб и др.).
 * Слева: аватар + опционально приветствие. В центре: опциональный контент (сторис и т.д.). Справа: кнопка поиска или другая.
 * Данные пользователя (displayName, avatarUrl) должны приходить из MAX Bridge и сохраняться в БД — один источник правды.
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

  return (
    <header className={`app-header app-header--white ${className}`.trim()} role="banner">
      <div className="app-header__inner">
        <button
          type="button"
          className="app-header__left"
          onClick={onProfileClick}
          aria-label="Профиль"
        >
          <span className="app-header__avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" />
            ) : (
              <span className="app-header__avatar-initial" aria-hidden>
                {(displayName || 'П').charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          {isMain && greeting != null && (
            <div className="app-header__greeting-block">
              <span className="app-header__greeting-line">{greeting},</span>
              <span className="app-header__greeting-name">{firstName ?? (displayName || '').split(' ')[0]}</span>
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
