import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUserFromMAX } from './userSlice';
import { mockUsers } from './mockUsers';

// Компонент для переключения между тестовыми пользователями
const UserSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const switchUser = (role) => {
    const user = mockUsers[role];
    setCurrentUser(user);
    
    // Обновляем Redux
    dispatch(setUserFromMAX({
      user: user,
      role: role,
      universityId: user.university_id
    }));
    
    // Обновляем localStorage
    localStorage.setItem('userRole', role);
    localStorage.setItem('universityId', String(user.university_id));
    localStorage.setItem('maxUserId', String(user.id));
    localStorage.setItem('testUser', JSON.stringify(user));
    
    // Перезагружаем страницу для применения изменений
    window.location.hash = '#/';
    window.location.reload();
  };

  return (
    <div className="user-switcher">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '12px',
          background: 'var(--max-primary)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          width: '200px',
          marginBottom: isOpen ? '8px' : '0'
        }}
      >
        🔄 Сменить пользователя
      </button>
      
      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            className={`user-switcher-btn ${currentUser?.role === 'student' ? 'active' : ''}`}
            onClick={() => switchUser('student')}
          >
            👨‍🎓 Студент (Иван)
          </button>
          <button 
            className={`user-switcher-btn ${currentUser?.role === 'applicant' ? 'active' : ''}`}
            onClick={() => switchUser('applicant')}
          >
            🎯 Абитуриент (Мария)
          </button>
          <button 
            className={`user-switcher-btn ${currentUser?.role === 'employee' ? 'active' : ''}`}
            onClick={() => switchUser('employee')}
          >
            👔 Сотрудник (Петр)
          </button>
          <button 
            className={`user-switcher-btn ${currentUser?.role === 'admin' ? 'active' : ''}`}
            onClick={() => switchUser('admin')}
          >
            ⚙️ Администратор (Анна)
          </button>
        </div>
      )}
    </div>
  );
};

export default UserSwitcher;

