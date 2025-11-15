import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service';

const NewsWidget = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await apiService.getNews();
        setNews(data.news || []);
      } catch (error) {
        console.error('Error loading news:', error);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  // Автопрокрутка карусели
  useEffect(() => {
    if (news.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % news.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [news.length]);

  const currentNews = news[currentIndex];

  return (
    <div className="widget news-widget">
      <div className="widget-header">
        <h3 className="widget-title">📰 Новости</h3>
        <button 
          className="widget-more-btn"
          onClick={() => navigate('/news')}
        >
          Все →
        </button>
      </div>
      <div className="widget-content">
        {loading ? (
          <div className="widget-loading">Загрузка...</div>
        ) : currentNews ? (
          <div className="news-widget-carousel">
            <div className="news-widget-item">
              <div className="news-widget-title">{currentNews.title}</div>
              <div className="news-widget-text">{currentNews.content || currentNews.text}</div>
              <div className="news-widget-date">
                {new Date(currentNews.date).toLocaleDateString('ru-RU')}
              </div>
            </div>
            {news.length > 1 && (
              <div className="news-widget-dots">
                {news.map((_, idx) => (
                  <button
                    key={idx}
                    className={`news-widget-dot ${idx === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="widget-empty">Новостей пока нет</div>
        )}
      </div>
    </div>
  );
};

export default NewsWidget;

