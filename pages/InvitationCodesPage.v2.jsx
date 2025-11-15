import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiService from '../api-service';

const InvitationCodesPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [formData, setFormData] = useState({
    role: 'student',
    count: 1
  });
  const [importData, setImportData] = useState('');
  const [newCodes, setNewCodes] = useState([]);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');
      const data = await apiService.getInvitationCodes(universityId);
      setCodes(data.codes || []);
    } catch (error) {
      console.error('Error loading codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');
      const data = await apiService.generateInvitationCodes(
        universityId,
        formData.role,
        formData.count
      );
      setNewCodes(data.codes || []);
      await loadCodes();
      alert(`Сгенерировано ${data.count} кодов`);
    } catch (error) {
      alert('Ошибка при генерации кодов');
      console.error('Generate codes error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleImport = async () => {
    try {
      // Парсим CSV или JSON данные
      let students = [];
      const lines = importData.trim().split('\n');
      
      // Предполагаем формат CSV: name,id,role (или просто name,id)
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          students.push({
            name: parts[0],
            id: parts[1],
            role: parts[2] || 'student'
          });
        }
      }

      if (students.length === 0) {
        alert('Нет данных для импорта');
        return;
      }

      const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1');
      const data = await apiService.importStudents(universityId, students);
      
      // Формируем таблицу для скачивания
      downloadCodesTable(data.results || []);
      
      alert(`Импортировано ${data.count} студентов. Коды скачаны.`);
      setImportData('');
      setShowImport(false);
      await loadCodes();
    } catch (error) {
      alert('Ошибка при импорте студентов');
      console.error('Import students error:', error);
    }
  };

  const downloadCodesTable = (results) => {
    // Формируем CSV
    const csvHeader = 'Имя,ID студента,Роль,Код приглашения\n';
    const csvRows = results.map(r => 
      `"${r.student_name}","${r.student_id}","${r.role}","${r.code}"`
    ).join('\n');
    const csv = csvHeader + csvRows;

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation-codes-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCodes = () => {
    const csvHeader = 'Код,Роль,Использован,Дата создания\n';
    const csvRows = codes.map(c => 
      `"${c.code}","${c.role}","${c.used_by_user_id ? 'Да' : 'Нет'}","${c.created_at}"`
    ).join('\n');
    const csv = csvHeader + csvRows;

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-codes-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка кодов...</p>
        </div>
      </div>
    );
  }

  const unusedCodes = codes.filter(c => !c.used_by_user_id);
  const usedCodes = codes.filter(c => c.used_by_user_id);

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
        <h1 className="page-title">🎫 Коды приглашения</h1>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">Генерация кодов</h2>
        <form onSubmit={handleGenerate}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Роль:
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--max-border)'
              }}
            >
              <option value="student">Студент</option>
              <option value="applicant">Абитуриент</option>
              <option value="employee">Сотрудник</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Количество:
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.count}
              onChange={(e) => setFormData({...formData, count: parseInt(e.target.value) || 1})}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--max-border)'
              }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={generating}
          >
            {generating ? 'Генерация...' : 'Сгенерировать коды'}
          </button>
        </form>

        {newCodes.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--max-bg-secondary)', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '8px' }}>Новые коды:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {newCodes.map((code, idx) => (
                <code key={idx} style={{ fontFamily: 'monospace', fontSize: '14px' }}>{code}</code>
              ))}
            </div>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                const text = newCodes.join('\n');
                navigator.clipboard.writeText(text);
                alert('Коды скопированы в буфер обмена');
              }}
              style={{ marginTop: '8px' }}
            >
              Копировать все
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title">Импорт студентов</h2>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowImport(!showImport)}
          >
            {showImport ? 'Скрыть' : 'Показать'}
          </button>
        </div>

        {showImport && (
          <div>
            <p style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--max-text-secondary)' }}>
              Вставьте данные студентов в формате CSV (каждая строка: имя, ID, роль):
            </p>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={10}
              placeholder="Иван Иванов,12345,student&#10;Мария Петрова,12346,student&#10;..."
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--max-border)',
                fontFamily: 'monospace',
                fontSize: '12px',
                marginBottom: '12px'
              }}
            />
            <button 
              className="btn btn-primary"
              onClick={handleImport}
              disabled={!importData.trim()}
            >
              Импортировать и сгенерировать коды
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title">Все коды</h2>
          <button 
            className="btn btn-secondary"
            onClick={downloadCodes}
          >
            📥 Скачать CSV
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Неиспользованные ({unusedCodes.length})</h3>
          {unusedCodes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {unusedCodes.slice(0, 20).map((code) => (
                <div key={code.id} style={{ 
                  padding: '8px', 
                  background: 'var(--max-bg-secondary)', 
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <code style={{ fontFamily: 'monospace', fontSize: '14px' }}>{code.code}</code>
                  <span style={{ fontSize: '12px', color: 'var(--max-text-secondary)' }}>
                    {code.role} • {new Date(code.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              ))}
              {unusedCodes.length > 20 && (
                <p style={{ fontSize: '12px', color: 'var(--max-text-secondary)' }}>
                  И ещё {unusedCodes.length - 20} кодов...
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--max-text-secondary)' }}>Нет неиспользованных кодов</p>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Использованные ({usedCodes.length})</h3>
          {usedCodes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {usedCodes.slice(0, 10).map((code) => (
                <div key={code.id} style={{ 
                  padding: '8px', 
                  background: 'var(--max-bg-secondary)', 
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: 0.7
                }}>
                  <code style={{ fontFamily: 'monospace', fontSize: '14px' }}>{code.code}</code>
                  <span style={{ fontSize: '12px', color: 'var(--max-text-secondary)' }}>
                    {code.role} • {code.used_at ? new Date(code.used_at).toLocaleDateString('ru-RU') : ''}
                  </span>
                </div>
              ))}
              {usedCodes.length > 10 && (
                <p style={{ fontSize: '12px', color: 'var(--max-text-secondary)' }}>
                  И ещё {usedCodes.length - 10} кодов...
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--max-text-secondary)' }}>Нет использованных кодов</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationCodesPage;

