import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUserFromMAX } from './userSlice.js';
import { mockUsers } from './mockUsers.js';

const ROLE_OPTIONS = [
  { role: 'student', label: 'Студент (Иван)', icon: '👨‍🎓' },
  { role: 'applicant', label: 'Абитуриент (Мария)', icon: '🎯' },
  { role: 'employee', label: 'Сотрудник (Петр)', icon: '👔' },
  { role: 'teacher', label: 'Учитель (Елена)', icon: '👨‍🏫' },
  { role: 'admin', label: 'Администратор (Анна)', icon: '⚙️' },
];

/** Переключатель роли: обновляет Redux и localStorage без перезагрузки страницы. */
const UserSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const dispatch = useDispatch();
  const currentRole = useSelector((state) => state.user.role);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const switchRole = (role) => {
    const user = mockUsers[role];
    if (!user) return;
    dispatch(setUserFromMAX({
      user,
      role,
      universityId: user.university_id,
      canChangeRole: true,
    }));
    localStorage.setItem('userRole', role);
    localStorage.setItem('universityId', String(user.university_id));
    localStorage.setItem('maxUserId', String(user.id));
    localStorage.setItem('testUser', JSON.stringify(user));
    setIsOpen(false);
  };

  return (
    <div className="user-switcher" ref={ref}>
      <button
        type="button"
        className="user-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Сменить роль"
      >
        Сменить роль
      </button>
      {isOpen && (
        <ul className="user-switcher-dropdown" role="listbox">
          {ROLE_OPTIONS.map(({ role, label, icon }) => (
            <li key={role}>
              <button
                type="button"
                className={`user-switcher-option ${currentRole === role ? 'active' : ''}`}
                onClick={() => switchRole(role)}
                role="option"
                aria-selected={currentRole === role}
              >
                <span className="user-switcher-option-icon" aria-hidden>{icon}</span>
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserSwitcher;

