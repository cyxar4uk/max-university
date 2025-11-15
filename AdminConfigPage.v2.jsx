import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from './api-service';
import UserSwitcher from './UserSwitcher';

// Компонент для drag & drop
const DraggableBlock = ({ block, index, onDragStart, onDragOver, onDrop, onDelete }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e)}
      onDrop={(e) => onDrop(e, index)}
      style={{
        padding: '12px',
        margin: '8px 0',
        background: 'var(--max-bg)',
        border: '2px dashed var(--max-border)',
        borderRadius: '8px',
        cursor: 'move',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>☰</span>
        <span>{block.name}</span>
        <span style={{ fontSize: '12px', color: 'var(--max-text-secondary)' }}>
          ({block.block_type})
        </span>
      </div>
      <button
        onClick={() => onDelete(block.id)}
        style={{
          padding: '4px 12px',
          background: 'var(--max-danger)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Удалить
      </button>
    </div>
  );
};

const AdminConfigPage = () => {
  const navigate = useNavigate();
  const { role } = useParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [headerColor, setHeaderColor] = useState('#0088CC');
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    loadConfig();
  }, [role]);

  const loadConfig = async () => {
    try {
      const data = await apiService.getAdminConfig(1, role || 'student');
      setConfig(data);
      if (data.sections && data.sections.length > 0) {
        setHeaderColor(data.header_color || '#0088CC');
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionNameEdit = (sectionId, currentName) => {
    setEditingSection(sectionId);
    setNewSectionName(currentName);
  };

  const saveSectionName = async (sectionId) => {
    try {
      await apiService.updateSectionName(sectionId, newSectionName);
      await loadConfig();
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating section name:', error);
      alert('Ошибка при обновлении названия раздела');
    }
  };

  const handleHeaderColorChange = async (color) => {
    setHeaderColor(color);
    try {
      await apiService.updateHeaderColor(1, role || 'student', color);
    } catch (error) {
      console.error('Error updating header color:', error);
      alert('Ошибка при обновлении цвета хедера');
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const section = config.sections[0]; // Пока работаем с первым разделом
    const blocks = [...section.blocks];
    const [draggedBlock] = blocks.splice(draggedIndex, 1);
    blocks.splice(dropIndex, 0, draggedBlock);

    // Обновляем порядок
    const blockIds = blocks.map(b => b.id);
    try {
      await apiService.reorderBlocks(blockIds);
      await loadConfig();
    } catch (error) {
      console.error('Error reordering blocks:', error);
      alert('Ошибка при изменении порядка блоков');
    }

    setDraggedIndex(null);
  };

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('Удалить этот блок?')) return;
    
    try {
      await apiService.deleteBlock(blockId);
      await loadConfig();
    } catch (error) {
      console.error('Error deleting block:', error);
      alert('Ошибка при удалении блока');
    }
  };

  const handleAddBlock = async (sectionId, blockType, blockName) => {
    try {
      await apiService.addBlock(sectionId, blockType, blockName);
      await loadConfig();
    } catch (error) {
      console.error('Error adding block:', error);
      alert('Ошибка при добавлении блока');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка конфигурации...</p>
        </div>
      </div>
    );
  }

  if (!config || !config.sections || config.sections.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <button onClick={() => navigate('/admin')}>← Назад</button>
          <h1>Настройка для роли: {role}</h1>
        </div>
        <div className="card">
          <p>Конфигурация не найдена</p>
        </div>
      </div>
    );
  }

  const section = config.sections[0]; // Пока работаем с первым разделом

  return (
    <div className="page">
      <div className="page-header" style={{ background: headerColor, color: 'white' }}>
        <button 
          onClick={() => navigate('/admin')}
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Назад
        </button>
        <h1 style={{ color: 'white', margin: 0 }}>Настройка: {role}</h1>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <h3>Цвет хедера</h3>
        <input
          type="color"
          value={headerColor}
          onChange={(e) => handleHeaderColorChange(e.target.value)}
          style={{ width: '100px', height: '40px', cursor: 'pointer' }}
        />
        <span style={{ marginLeft: '12px' }}>{headerColor}</span>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>
            {editingSection === section.id ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--max-border)' }}
                />
                <button onClick={() => saveSectionName(section.id)}>Сохранить</button>
                <button onClick={() => setEditingSection(null)}>Отмена</button>
              </div>
            ) : (
              <>
                {section.name}
                <button
                  onClick={() => handleSectionNameEdit(section.id, section.name)}
                  style={{ marginLeft: '12px', padding: '4px 12px', fontSize: '12px' }}
                >
                  ✏️ Редактировать
                </button>
              </>
            )}
          </h3>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4>Блоки (перетащите для изменения порядка):</h4>
          {section.blocks.map((block, index) => (
            <DraggableBlock
              key={block.id}
              block={block}
              index={index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDelete={handleDeleteBlock}
            />
          ))}
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--max-bg-secondary)', borderRadius: '8px' }}>
          <h4>Добавить блок:</h4>
          <select
            id="blockTypeSelect"
            style={{ padding: '8px', marginRight: '8px', borderRadius: '4px' }}
          >
            <option value="profile">Профиль</option>
            <option value="schedule">Расписание</option>
            <option value="lms">Учебные материалы</option>
            <option value="services">Услуги</option>
            <option value="life">Внеучебная жизнь</option>
            <option value="news">Новости</option>
            <option value="admission">Поступление</option>
            <option value="payment">Оплата</option>
            <option value="analytics">Аналитика</option>
            <option value="config">Настройки</option>
            <option value="users">Пользователи</option>
          </select>
          <button
            onClick={() => {
              const select = document.getElementById('blockTypeSelect');
              const blockType = select.value;
              const blockNames = {
                profile: 'Профиль',
                schedule: 'Расписание',
                lms: 'Учебные материалы',
                services: 'Услуги',
                life: 'Внеучебная жизнь',
                news: 'Новости',
                admission: 'Поступление',
                payment: 'Оплата',
                analytics: 'Аналитика',
                config: 'Настройки',
                users: 'Пользователи'
              };
              handleAddBlock(section.id, blockType, blockNames[blockType]);
            }}
            className="btn btn-primary"
          >
            Добавить блок
          </button>
        </div>
      </div>

      <UserSwitcher />
    </div>
  );
};

export default AdminConfigPage;

