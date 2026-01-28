import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service.js';

const AdmissionLevelPage = () => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const data = await apiService.getEducationLevels();
      setLevels(data.levels || [
        { id: 'бакалавриат', name: 'Бакалавриат', description: 'Программы бакалавриата по различным направлениям', duration: '4 года', icon: '🎓' },
        { id: 'магистратура', name: 'Магистратура', description: 'Программы магистратуры для углубленного изучения', duration: '2 года', icon: '📖' },
        { id: 'аспирантура', name: 'Аспирантура', description: 'Программы подготовки кадров высшей квалификации', duration: '3-4 года', icon: '🔬' }
      ]);
    } catch (error) {
      console.error('Error loading levels:', error);
      setLevels([
        { id: 'бакалавриат', name: 'Бакалавриат', description: 'Программы бакалавриата по различным направлениям', duration: '4 года', icon: '🎓' },
        { id: 'магистратура', name: 'Магистратура', description: 'Программы магистратуры для углубленного изучения', duration: '2 года', icon: '📖' },
        { id: 'аспирантура', name: 'Аспирантура', description: 'Программы подготовки кадров высшей квалификации', duration: '3-4 года', icon: '🔬' }
      ]);
    } finally {
      setLoading(false);
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
        <h1 className="page-title">📄 Выберите уровень образования</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 16px' }}>
        {levels.map((level) => (
          <div 
            key={level.id} 
            className="card card-clickable"
            onClick={() => navigate(`/admission/directions/${level.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '12px' }}>
              {level.icon}
            </div>
            <h3 className="card-title">{level.name}</h3>
            <p className="card-text">{level.description}</p>
            <p className="card-text">
              <strong>Длительность:</strong> {level.duration}
            </p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '12px', width: '100%' }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admission/directions/${level.id}`);
              }}
            >
              Выбрать направление →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdmissionLevelPage;




