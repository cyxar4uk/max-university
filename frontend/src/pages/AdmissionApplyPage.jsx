import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiService from '../api-service.js';

const AdmissionApplyPage = () => {
  const { directionId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [direction, setDirection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    personal_info: {
      first_name: '',
      last_name: '',
      middle_name: '',
      birth_date: '',
      phone: '',
      email: '',
      address: ''
    },
    exam_scores: {},
    application_file: null
  });

  useEffect(() => {
    if (directionId) {
      loadDirection();
      // Заполняем форму данными пользователя
      if (user.firstName) {
        setFormData(prev => ({
          ...prev,
          personal_info: {
            ...prev.personal_info,
            first_name: user.firstName,
            last_name: user.lastName || '',
            email: user.email || ''
          }
        }));
      }
    }
  }, [directionId, user]);

  const loadDirection = async () => {
    try {
      const data = await apiService.getAdmissionDirection(parseInt(directionId));
      setDirection(data);
      
      // Инициализируем поля для баллов ЕГЭ
      if (data && data.required_exams) {
        const examScores = {};
        data.required_exams.forEach(exam => {
          examScores[exam] = '';
        });
        setFormData(prev => ({
          ...prev,
          exam_scores: examScores
        }));
      }
    } catch (error) {
      console.error('Error loading direction:', error);
      alert('Ошибка загрузки направления');
      navigate('/admission/level');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleExamScoreChange = (exam, value) => {
    setFormData(prev => ({
      ...prev,
      exam_scores: {
        ...prev.exam_scores,
        [exam]: value
      }
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // В реальном приложении здесь была бы загрузка файла на сервер
      // Пока сохраняем только имя файла
      setFormData(prev => ({
        ...prev,
        application_file: file.name
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.personal_info.first_name || !formData.personal_info.last_name) {
      alert('Заполните обязательные поля: Имя и Фамилия');
      return;
    }

    if (direction && direction.required_exams) {
      const missingScores = direction.required_exams.filter(exam => !formData.exam_scores[exam] || formData.exam_scores[exam] === '');
      if (missingScores.length > 0) {
        alert(`Заполните баллы ЕГЭ: ${missingScores.join(', ')}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');
      const userId = user.maxUserId || parseInt(localStorage.getItem('maxUserId') || '10001');
      
      // Получаем уровень образования из направления
      const educationLevel = direction.education_level || 'бакалавриат';
      
      const result = await apiService.submitApplication({
        user_id: userId,
        university_id: universityId,
        direction_id: parseInt(directionId),
        education_level: educationLevel,
        personal_info: formData.personal_info,
        exam_scores: formData.exam_scores,
        application_file_url: formData.application_file ? `/files/${formData.application_file}` : null
      });

      if (result.success) {
        alert('Заявление успешно подано!');
        navigate('/admission/my-applications');
      } else {
        alert('Ошибка при подаче заявления');
      }
    } catch (error) {
      console.error('Submit application error:', error);
      alert('Ошибка при подаче заявления: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setSubmitting(false);
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

  if (!direction) {
    return (
      <div className="page">
        <div className="card">
          <p className="card-text">Направление не найдено</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <button 
          onClick={() => navigate(`/admission/directions/${direction.education_level}`)}
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
        <h1 className="page-title">📝 Подача заявления</h1>
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 className="card-title">{direction.name}</h3>
          <p style={{ fontSize: '12px', color: 'var(--max-text-secondary)', marginBottom: '8px' }}>
            Код: {direction.code}
          </p>
          <p className="card-text" style={{ fontSize: '14px' }}>{direction.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <h2 className="card-title" style={{ marginBottom: '16px' }}>Личная информация</h2>
          
          <div className="form-group">
            <label htmlFor="first_name">Имя *</label>
            <input
              id="first_name"
              type="text"
              value={formData.personal_info.first_name}
              onChange={(e) => handleInputChange('personal_info', 'first_name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Фамилия *</label>
            <input
              id="last_name"
              type="text"
              value={formData.personal_info.last_name}
              onChange={(e) => handleInputChange('personal_info', 'last_name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="middle_name">Отчество</label>
            <input
              id="middle_name"
              type="text"
              value={formData.personal_info.middle_name}
              onChange={(e) => handleInputChange('personal_info', 'middle_name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="birth_date">Дата рождения</label>
            <input
              id="birth_date"
              type="date"
              value={formData.personal_info.birth_date}
              onChange={(e) => handleInputChange('personal_info', 'birth_date', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Телефон</label>
            <input
              id="phone"
              type="tel"
              value={formData.personal_info.phone}
              onChange={(e) => handleInputChange('personal_info', 'phone', e.target.value)}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={formData.personal_info.email}
              onChange={(e) => handleInputChange('personal_info', 'email', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Адрес</label>
            <textarea
              id="address"
              value={formData.personal_info.address}
              onChange={(e) => handleInputChange('personal_info', 'address', e.target.value)}
              rows={3}
            />
          </div>

          <h2 className="card-title" style={{ marginTop: '24px', marginBottom: '16px' }}>Баллы ЕГЭ</h2>
          
          {direction.required_exams && direction.required_exams.length > 0 ? (
            direction.required_exams.map((exam) => (
              <div key={exam} className="form-group">
                <label htmlFor={`exam_${exam}`}>{exam} *</label>
                <input
                  id={`exam_${exam}`}
                  type="number"
                  min="0"
                  max="100"
                  value={formData.exam_scores[exam] || ''}
                  onChange={(e) => handleExamScoreChange(exam, e.target.value)}
                  required
                  placeholder="Введите балл"
                />
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--max-text-secondary)', fontSize: '14px' }}>
              ЕГЭ не требуются для этого направления
            </p>
          )}

          <h2 className="card-title" style={{ marginTop: '24px', marginBottom: '16px' }}>Документы</h2>
          
          <div className="form-group">
            <label htmlFor="application_file">Заявление (PDF, DOC, DOCX)</label>
            <input
              id="application_file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />
            {formData.application_file && (
              <p style={{ fontSize: '12px', color: 'var(--max-text-secondary)', marginTop: '4px' }}>
                Выбран файл: {formData.application_file}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '24px' }}
            disabled={submitting}
          >
            {submitting ? 'Отправка...' : 'Подать заявление'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdmissionApplyPage;

