import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserSwitcher from './UserSwitcher';

const AdmissionPage = () => {
  const navigate = useNavigate();

  const programs = [
    { 
      id: 1, 
      name: 'Бакалавриат', 
      description: 'Программы бакалавриата по различным направлениям',
      duration: '4 года',
      icon: '🎓'
    },
    { 
      id: 2, 
      name: 'Магистратура', 
      description: 'Программы магистратуры для углубленного изучения',
      duration: '2 года',
      icon: '📖'
    },
    { 
      id: 3, 
      name: 'Аспирантура', 
      description: 'Программы подготовки кадров высшей квалификации',
      duration: '3-4 года',
      icon: '🔬'
    }
  ];

  const handleApply = () => {
    alert('Открывается форма подачи заявления');
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
        <h1 className="page-title">📄 Поступление</h1>
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Образовательные программы</h2>

      <div>
        {programs.map((program) => (
          <div key={program.id} className="card">
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '12px' }}>
              {program.icon}
            </div>
            <h3 className="card-title">{program.name}</h3>
            <p className="card-text">{program.description}</p>
            <p className="card-text">
              <strong>Длительность:</strong> {program.duration}
            </p>
            <button className="btn btn-primary" style={{ marginTop: '12px' }}>
              Подробнее
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="card-title">Подать заявление</h3>
        <p className="card-text" style={{ marginBottom: '12px' }}>
          Заполните анкету и подайте заявление на поступление
        </p>
        <button className="btn btn-success" onClick={handleApply}>
          Подать заявление
        </button>
      </div>

      <UserSwitcher />
    </div>
  );
};

export default AdmissionPage;

