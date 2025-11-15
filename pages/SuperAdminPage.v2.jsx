import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service';

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    description: '',
    admin_user_id: ''
  });

  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = async () => {
    try {
      const data = await apiService.getAllUniversities();
      setUniversities(data.universities || []);
    } catch (error) {
      console.error('Error loading universities:', error);
      alert('Ошибка загрузки университетов. Возможно, у вас нет прав суперадмина.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUniversity = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.admin_user_id) {
      alert('Заполните все обязательные поля');
      return;
    }

    try {
      await apiService.createUniversity(
        formData.name,
        formData.short_name,
        formData.description,
        parseInt(formData.admin_user_id)
      );
      alert('Университет создан успешно');
      setShowCreateForm(false);
      setFormData({ name: '', short_name: '', description: '', admin_user_id: '' });
      await loadUniversities();
    } catch (error) {
      alert('Ошибка при создании университета');
      console.error('Create university error:', error);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <button 
          onClick={() => navigate('/admin')}
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
        <h1 className="page-title">🔧 Панель суперадмина</h1>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title">Управление университетами</h2>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Отмена' : '+ Создать университет'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateUniversity} style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Название университета: *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--max-border)'
                }}
                placeholder="Российская академия народного хозяйства"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Короткое название:
              </label>
              <input
                type="text"
                value={formData.short_name}
                onChange={(e) => setFormData({...formData, short_name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--max-border)'
                }}
                placeholder="РАНХиГС"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Описание:
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--max-border)',
                  resize: 'vertical'
                }}
                placeholder="Описание университета"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                ID пользователя-администратора: *
              </label>
              <input
                type="number"
                value={formData.admin_user_id}
                onChange={(e) => setFormData({...formData, admin_user_id: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--max-border)'
                }}
                placeholder="12345"
              />
              <p style={{ fontSize: '12px', color: 'var(--max-text-secondary)', marginTop: '4px' }}>
                Пользователь должен быть зарегистрирован в системе
              </p>
            </div>

            <button type="submit" className="btn btn-primary">
              Создать университет
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Список университетов ({universities.length})</h2>
        {universities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {universities.map((univ) => (
              <div key={univ.id} style={{
                padding: '16px',
                background: 'var(--max-bg-secondary)',
                borderRadius: '8px'
              }}>
                <h3 style={{ marginBottom: '8px' }}>{univ.name}</h3>
                {univ.short_name && (
                  <p style={{ fontSize: '14px', color: 'var(--max-text-secondary)', marginBottom: '8px' }}>
                    {univ.short_name}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--max-text-secondary)' }}>
                  <span>👥 Пользователей: {univ.user_count || 0}</span>
                  <span>🎫 Неиспользованных кодов: {univ.unused_codes_count || 0}</span>
                  <span>📅 Создан: {new Date(univ.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--max-text-secondary)' }}>Нет университетов</p>
        )}
      </div>
    </div>
  );
};

export default SuperAdminPage;

