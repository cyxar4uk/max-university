import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service.js';

const NewsPage = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await apiService.getNews();
        setNews(data.news || []);
      } catch (error) {
        console.error('Error loading news:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  const categoryNames = {
    announcement: 'Объявление',
    achievement: 'Достижение',
    event: 'Событие',
    general: 'Общее'
  };

  return (
    <div className="page">
      <div className="page-header">
        <button 
          onClick={() => navigate('/home')}
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
        <h1 className="page-title">📰 Новости</h1>
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Новости университета</h2>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка новостей...</p>
        </div>
      ) : news.length > 0 ? (
        <div>
          {news.map((item) => (
            <div key={item.id} className="card">
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: 'var(--max-bg-secondary)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                textTransform: 'uppercase',
                marginBottom: '12px'
              }}>
                {categoryNames[item.category] || item.category}
              </div>
              <h3 className="card-title">{item.title}</h3>
              <p className="card-text" style={{ marginBottom: '12px' }}>
                {item.content}
              </p>
              <p className="card-text" style={{ fontSize: '13px' }}>
                📅 {item.date}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p className="card-text">Нет новостей</p>
        </div>
      )}

      <UserSwitcher />
    </div>
  );
};

export default NewsPage;

