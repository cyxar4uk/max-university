import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiService from '../api-service.js';

const AdmissionMyApplicationsPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const userId = user.maxUserId || parseInt(localStorage.getItem('maxUserId') || '10001');
      const data = await apiService.getMyApplications(userId);
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': { text: 'На проверке', color: 'var(--max-warning)' },
      'approved': { text: 'Принято', color: 'var(--max-success)' },
      'rejected': { text: 'Отклонено', color: 'var(--max-danger)' }
    };
    return labels[status] || { text: status, color: 'var(--max-text-secondary)' };
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
      <div className="page-header">
        <button 
          onClick={() => navigate('/admission')}
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
        <h1 className="page-title">📋 Мои заявления</h1>
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        {applications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {applications.map((app) => {
              const status = getStatusLabel(app.status);
              return (
                <div key={app.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h3 className="card-title" style={{ marginBottom: '4px' }}>
                        {app.direction_name || 'Направление'}
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--max-text-secondary)', margin: 0 }}>
                        Код: {app.direction_code || 'N/A'}
                      </p>
                    </div>
                    <span 
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: status.color + '20',
                        color: status.color
                      }}
                    >
                      {status.text}
                    </span>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--max-text-secondary)', marginBottom: '4px' }}>
                      Подано: {new Date(app.created_at).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {app.reviewed_at && (
                      <p style={{ fontSize: '13px', color: 'var(--max-text-secondary)' }}>
                        Проверено: {new Date(app.reviewed_at).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>

                  {app.review_notes && (
                    <div style={{ 
                      padding: '12px', 
                      background: 'var(--max-bg-secondary)', 
                      borderRadius: '8px',
                      marginTop: '12px'
                    }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Комментарий:</p>
                      <p style={{ fontSize: '13px', color: 'var(--max-text-secondary)', margin: 0 }}>
                        {app.review_notes}
                      </p>
                    </div>
                  )}

                  {app.exam_scores && Object.keys(app.exam_scores).length > 0 && (
                    <div style={{ marginTop: '12px' }}>
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <p className="card-text">У вас нет поданных заявлений</p>
            <button 
              className="btn btn-primary"
              style={{ marginTop: '12px' }}
              onClick={() => navigate('/admission/level')}
            >
              Подать заявление
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmissionMyApplicationsPage;




