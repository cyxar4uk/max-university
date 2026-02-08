import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Panel, Typography } from '@maxhub/max-ui';
import { useMAXBridge } from '../useMAXBridge.js';
import { getDisplayUser } from '../utils/displayUser.js';
import UserSwitcher from '../UserSwitcher.jsx';
import { setRole } from '../userSlice.js';

const baseUrl = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
const icon = (name) => `${baseUrl}icons/${name}.svg`;

const roleNames = {
  student: 'Студент',
  applicant: 'Абитуриент',
  employee: 'Сотрудник',
  teacher: 'Учитель',
  admin: 'Администратор',
};

const UNIVERSITY_OPTIONS = [
  { id: 1, name: 'РАНХиГС' },
  { id: 2, name: 'МГУ' },
  { id: 3, name: 'ВШЭ' },
];

/**
 * Настройки профиля: блок тестирования (роль + университет), Помощь, Что нового.
 */
const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const { displayName } = getDisplayUser(userInfo, user);
  const [universitySelectOpen, setUniversitySelectOpen] = useState(false);
  const ref = useRef(null);

  const currentRoleLabel = user.role ? (roleNames[user.role] || user.role) : '—';
  const currentUniversity = UNIVERSITY_OPTIONS.find((u) => u.id === user.universityId) || UNIVERSITY_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setUniversitySelectOpen(false);
    };
    if (universitySelectOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [universitySelectOpen]);

  const setUniversity = (universityId) => {
    dispatch(setRole({ role: user.role, universityId }));
    localStorage.setItem('universityId', String(universityId));
    setUniversitySelectOpen(false);
  };

  return (
    <Panel mode="secondary" className="profile-page-panel profile-settings-page">
      <header className="profile-figma-header">
        <button type="button" className="profile-header-back" onClick={() => navigate(-1)} aria-label="Назад">
          ‹
        </button>
        <div className="profile-figma-header-center">
          <Typography.Headline variant="small" className="profile-figma-header-name">{displayName}</Typography.Headline>
          <Typography.Body variant="small" className="profile-figma-header-role">{currentRoleLabel}</Typography.Body>
        </div>
        <div className="profile-figma-header-right">
          <img src={icon('iconsettings')} alt="" width={20} height={20} aria-hidden />
          <Typography.Action variant="small" className="profile-figma-header-label">Настройки</Typography.Action>
        </div>
      </header>

      <div className="profile-settings-content">

        <section className="profile-settings-block profile-settings-testing">
          <Typography.Headline variant="small" className="profile-settings-block-title">Тестирование</Typography.Headline>
          <div className="profile-settings-testing-row">
            <Typography.Body variant="medium">{currentRoleLabel}</Typography.Body>
            {user.canChangeRole !== false && <UserSwitcher />}
          </div>
          <div className="profile-settings-testing-row">
            <Typography.Body variant="medium">{currentUniversity.name}</Typography.Body>
            <div className="profile-settings-university-switcher" ref={ref}>
              <button
                type="button"
                className="profile-settings-btn-secondary"
                onClick={() => setUniversitySelectOpen(!universitySelectOpen)}
              >
                Сменить университет
              </button>
              {universitySelectOpen && (
                <ul className="profile-settings-university-dropdown">
                  {UNIVERSITY_OPTIONS.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={user.universityId === u.id ? 'active' : ''}
                        onClick={() => setUniversity(u.id)}
                      >
                        {u.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <button type="button" className="profile-settings-link-row" onClick={() => {}}>
          <Typography.Body variant="medium">Помощь и поддержка</Typography.Body>
          <span className="profile-settings-chevron">›</span>
        </button>

        <button type="button" className="profile-settings-link-row" onClick={() => navigate('/profile/changelog')}>
          <Typography.Body variant="medium">Что нового</Typography.Body>
          <span className="profile-settings-chevron">›</span>
          <span className="profile-settings-dot" aria-hidden />
        </button>
      </div>
    </Panel>
  );
};

export default ProfileSettingsPage;
