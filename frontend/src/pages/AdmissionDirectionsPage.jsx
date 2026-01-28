import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../api-service.js';

const AdmissionDirectionsPage = () => {
  const { level } = useParams();
  const navigate = useNavigate();
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (level) {
      loadDirections();
    }
  }, [level]);

  const loadDirections = async () => {
    try {
      const universityId = parseInt(localStorage.getItem('universityId') || '1');
      const data = await apiService.getAdmissionDirections(universityId, level);
      setDirections(data.directions || []);
    } catch (error) {
      console.error('Error loading directions:', error);
      // Мок-данные для демонстрации
      setDirections(getMockDirections(level));
    } finally {
      setLoading(false);
    }
  };

  const getMockDirections = (educationLevel) => {
    const mockData = {
      'бакалавриат': [
        {
          id: 1,
          code: '09.03.01',
          name: 'Информатика и вычислительная техника',
          description: 'Подготовка специалистов в области разработки программного обеспечения, системного администрирования и информационных технологий',
          required_exams: ['Математика', 'Русский язык', 'Информатика'],
          cost_per_year: 250000,
          gradient_color: '#4A90E2',
          education_level: level
        },
        {
          id: 2,
          code: '38.03.01',
          name: 'Экономика',
          description: 'Изучение экономических процессов, финансового анализа и управления экономическими системами',
          required_exams: ['Математика', 'Русский язык', 'Обществознание'],
          cost_per_year: 220000,
          gradient_color: '#50C878',
          education_level: level
        },
        {
          id: 3,
          code: '01.03.02',
          name: 'Прикладная математика и информатика',
          description: 'Математическое моделирование, алгоритмы и вычислительные методы',
          required_exams: ['Математика', 'Русский язык', 'Информатика'],
          cost_per_year: 240000,
          gradient_color: '#FF6B6B',
          education_level: level
        }
      ],
      'магистратура': [
        {
          id: 4,
          code: '09.04.01',
          name: 'Информатика и вычислительная техника',
          description: 'Углубленное изучение современных информационных технологий и систем',
          required_exams: ['Математика', 'Русский язык'],
          cost_per_year: 280000,
          gradient_color: '#9B59B6',
          education_level: level
        }
      ],
      'аспирантура': [
        {
          id: 5,
          code: '09.06.01',
          name: 'Информатика и вычислительная техника',
          description: 'Научно-исследовательская деятельность в области информатики',
          required_exams: [],
          cost_per_year: 300000,
          gradient_color: '#E67E22',
          education_level: level
        }
      ]
    };
    return mockData[educationLevel] || [];
  };

  const getGradientStyle = (color) => {
    return {
      background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
      height: '120px',
      borderRadius: '12px 12px 0 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '48px'
    };
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка направлений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <button 
          onClick={() => navigate('/admission/level')}
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
        <h1 className="page-title">📚 Направления подготовки</h1>
      </div>

      <div style={{ padding: '0 16px', marginBottom: '16px' }}>
        <p style={{ color: 'var(--max-text-secondary)', fontSize: '14px' }}>
          Уровень: <strong>{level === 'бакалавриат' ? 'Бакалавриат' : level === 'магистратура' ? 'Магистратура' : 'Аспирантура'}</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 16px 24px' }}>
        {directions.length > 0 ? (
          directions.map((direction) => (
            <div key={direction.id} className="admission-direction-card">
              <div style={getGradientStyle(direction.gradient_color || '#4A90E2')}>
                {direction.image_url ? (
                  <img src={direction.image_url} alt={direction.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px 12px 0 0' }} />
                ) : (
                  <span style={{ opacity: 0.3 }}>📚</span>
                )}
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <h3 className="card-title" style={{ marginBottom: '4px' }}>{direction.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--max-text-secondary)', margin: 0 }}>
                      Код: {direction.code}
                    </p>
                  </div>
                </div>
                
                <p className="card-text" style={{ marginBottom: '12px', fontSize: '14px' }}>
                  {direction.description}
                </p>

                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Требуемые ЕГЭ:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {direction.required_exams && direction.required_exams.length > 0 ? (
                      direction.required_exams.map((exam, idx) => (
                        <span 
                          key={idx}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--max-bg-secondary)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          {exam}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--max-text-secondary)' }}>Не указаны</span>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--max-primary)' }}>
                    {direction.cost_per_year ? `${direction.cost_per_year.toLocaleString('ru-RU')} ₽/год` : 'Бесплатно'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => navigate(`/admission/direction/${direction.id}`)}
                  >
                    Подробнее
                  </button>
                  <button 
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => navigate(`/admission/apply/${direction.id}`)}
                  >
                    Подать заявление
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card">
            <p className="card-text">Нет доступных направлений для выбранного уровня</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmissionDirectionsPage;

