import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Panel, Typography } from '@maxhub/max-ui';
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
 * Смена роли и вуза обновляет Redux — вкладка «Учеба» подхватывает user.role и user.universityId.
 */
const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
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
      <header className="profile-header-only">
        <button type="button" className="profile-header-back" onClick={() => navigate(-1)} aria-label="Назад">
          <img src={icon('icon-back')} alt="" width={24} height={24} />
        </button>
      </header>

      <div className="profile-settings-content">
        <section className="profile-settings-block">
          <span className="profile-settings-icon"><img src={icon('icon-settings')} alt="" width={22} height={22} /></span>
          <Typography.Body variant="medium">Настройки</Typography.Body>
        </section>

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
