import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiService from '../api-service.js';
import BackendWarning from '../components/BackendWarning.jsx';

const AdminApplicationsPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');
      const data = await apiService.getPendingApplications(universityId);
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (applicationId, status) => {
    if (!reviewNotes.trim() && status === 'rejected') {
      alert('Укажите причину отклонения');
      return;
    }

    try {
      await apiService.reviewApplication(applicationId, status, reviewNotes);
      alert(`Заявление ${status === 'approved' ? 'принято' : 'отклонено'}`);
      setSelectedApp(null);
      setReviewNotes('');
      await loadApplications();
    } catch (error) {
      console.error('Review application error:', error);
      alert('Ошибка при проверке заявления');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка заявлений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <BackendWarning />
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
        <h1 className="page-title">📋 Проверка заявлений</h1>
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        {applications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {applications.map((app) => (
              <div key={app.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <h3 className="card-title" style={{ marginBottom: '4px' }}>
                      {app.direction_name || 'Направление'}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--max-text-secondary)', marginBottom: '4px' }}>
                      Код: {app.direction_code || 'N/A'}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--max-text-secondary)' }}>
                      Абитуриент: {app.first_name} {app.last_name}
                    </p>
                  </div>
                  <span 
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: 'var(--max-warning)20',
                      color: 'var(--max-warning)'
                    }}
                  >
                    На проверке
                  </span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--max-text-secondary)', marginBottom: '4px' }}>
                    Подано: {new Date(app.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {app.personal_info && (
                  <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--max-bg-secondary)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Личная информация:</p>
                    <p style={{ fontSize: '13px', marginBottom: '4px' }}>
                      {app.personal_info.first_name} {app.personal_info.last_name} {app.personal_info.middle_name || ''}
                    </p>
                    {app.personal_info.phone && (
                      <p style={{ fontSize: '13px', color: 'var(--max-text-secondary)', marginBottom: '4px' }}>
                        Телефон: {app.personal_info.phone}
                      </p>
                    )}
                    {app.personal_info.email && (
                      <p style={{ fontSize: '13px', color: 'var(--max-text-secondary)' }}>
                        Email: {app.personal_info.email}
                      </p>
                    )}
                  </div>
                )}

                {app.exam_scores && Object.keys(app.exam_scores).length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Баллы ЕГЭ:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(app.exam_scores).map(([exam, score]) => (
                        <span 
                          key={exam}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--max-bg-secondary)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          {exam}: {score}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {app.application_file_url && (
                  <div style={{ marginBottom: '12px' }}>
                    <a 
                      href={app.application_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '13px', color: 'var(--max-primary)' }}
                    >
                      📎 Скачать заявление
                    </a>
                  </div>
                )}

                {selectedApp?.id === app.id ? (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'var(--max-bg-secondary)', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label>Комментарий (обязательно при отклонении):</label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                        placeholder="Введите комментарий..."
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button 
                        className="btn btn-success"
                        style={{ flex: 1 }}
                        onClick={() => handleReview(app.id, 'approved')}
                      >
                        Принять
                      </button>
                      <button 
                        className="btn btn-danger"
                        style={{ flex: 1 }}
                        onClick={() => handleReview(app.id, 'rejected')}
                      >
                        Отклонить
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedApp(null);
                          setReviewNotes('');
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button 
                      className="btn btn-success"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setSelectedApp(app);
                        setReviewNotes('');
                      }}
                    >
                      Проверить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <p className="card-text">Нет заявлений на проверку</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApplicationsPage;




