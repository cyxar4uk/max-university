import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api-service';
import BackendWarning from '../components/BackendWarning.jsx';

const CustomBlocksPage = () => {
  const navigate = useNavigate();
  const [standards, setStandards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    block_type: '',
    name: '',
    description: '',
    code: '',
    config_schema: '{}'
  });

  useEffect(() => {
    const loadStandards = async () => {
      try {
        const data = await apiService.getDevelopmentStandards();
        setStandards(data);
      } catch (error) {
        console.error('Error loading standards:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStandards();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let configSchema;
      try {
        configSchema = JSON.parse(formData.config_schema);
      } catch (e) {
        alert('Ошибка в JSON схеме конфигурации');
        setSubmitting(false);
        return;
      }

      await apiService.submitCustomBlock({
        block_type: formData.block_type,
        name: formData.name,
        description: formData.description,
        code: formData.code,
        config_schema: configSchema
      });

      alert('Блок отправлен на модерацию! Вы получите уведомление после проверки.');
      setFormData({
        block_type: '',
        name: '',
        description: '',
        code: '',
        config_schema: '{}'
      });
    } catch (error) {
      console.error('Error submitting block:', error);
      alert('Ошибка при отправке блока на модерацию');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка стандартов...</p>
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
        <h1 className="page-title">📦 Кастомные блоки</h1>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">Стандарты разработки</h2>
        {standards && (
          <div>
            <h3>Структура виджета</h3>
            <pre style={{ 
              background: 'var(--max-bg-secondary)', 
              padding: '12px', 
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {standards.standards.widget_structure.example}
            </pre>

            <h3 style={{ marginTop: '16px' }}>Параметры</h3>
            <ul>
              <li><strong>config</strong>: {standards.standards.props.config}</li>
              <li><strong>apiService</strong>: {standards.standards.props.apiService}</li>
            </ul>

            <h3 style={{ marginTop: '16px' }}>Безопасность</h3>
            <ul>
              {standards.standards.security.restrictions.map((restriction, idx) => (
                <li key={idx}>{restriction}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Отправить блок на модерацию</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Тип блока (уникальный идентификатор):
            </label>
            <input
              type="text"
              value={formData.block_type}
              onChange={(e) => setFormData({...formData, block_type: e.target.value})}
              required
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--max-border)'
              }}
              placeholder="например: custom_news"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Название блока:
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
              placeholder="например: Новости кампуса"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Описание:
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--max-border)',
                resize: 'vertical'
              }}
              placeholder="Опишите функционал блока"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Код виджета (JavaScript/JSX):
            </label>
            <textarea
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              required
              rows={15}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--max-border)',
                fontFamily: 'monospace',
                fontSize: '12px',
                resize: 'vertical'
              }}
              placeholder={'import React from \'react\';\n\nconst CustomWidget = ({ config }) => {\n  return (\n    <div className="widget">\n      {/* Ваш код */}\n    </div>\n  );\n};\n\nexport default CustomWidget;'}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              JSON Schema конфигурации:
            </label>
            <textarea
              value={formData.config_schema}
              onChange={(e) => setFormData({...formData, config_schema: e.target.value})}
              required
              rows={8}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--max-border)',
                fontFamily: 'monospace',
                fontSize: '12px',
                resize: 'vertical'
              }}
              placeholder='{"type": "object", "properties": {...}}'
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Отправка...' : 'Отправить на модерацию'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CustomBlocksPage;

