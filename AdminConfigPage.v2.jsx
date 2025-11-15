import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from './api-service';

// Компонент для drag & drop блоков
const DraggableBlock = ({ block, index, onDragStart, onDragOver, onDrop, onDelete }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e)}
      onDrop={(e) => onDrop(e, index)}
      className="draggable-item"
    >
      <div className="drag-handle">
        <span>☰</span>
        <span className="item-name">{block.name}</span>
        <span className="item-type">({block.block_type})</span>
      </div>
      <button
        onClick={() => onDelete(block.id)}
        className="btn-delete"
      >
        Удалить
      </button>
    </div>
  );
};

// Компонент для drag & drop разделов
const DraggableSection = ({ section, index, onDragStart, onDragOver, onDrop, onEdit, onDelete, isActive }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e)}
      onDrop={(e) => onDrop(e, index)}
      className={`draggable-section ${isActive ? 'active' : ''}`}
    >
      <div className="drag-handle">
        <span>☰</span>
        <span className="item-name">{section.name}</span>
        <span className="item-info">({section.blocks?.length || 0} блоков)</span>
      </div>
      <div className="section-actions">
        <button onClick={() => onEdit(section.id)} className="btn-edit">✏️</button>
        <button onClick={() => onDelete(section.id)} className="btn-delete">🗑️</button>
      </div>
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
  const [draggedBlockIndex, setDraggedBlockIndex] = useState(null);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionNameInput, setNewSectionNameInput] = useState('');

  useEffect(() => {
    loadConfig();
  }, [role]);

  const loadConfig = async () => {
    try {
      const data = await apiService.getAdminConfig(1, role || 'student');
      setConfig(data);
      if (data.sections && data.sections.length > 0) {
        setHeaderColor(data.header_color || '#0088CC');
        setActiveSectionId(data.sections[0].id);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentSection = config?.sections?.find(s => s.id === activeSectionId) || config?.sections?.[0];

  // ============ РАБОТА С РАЗДЕЛАМИ ============

  const handleSectionNameEdit = (sectionId, currentName) => {
    setEditingSection(sectionId);
    setNewSectionName(currentName);
  };

  const saveSectionName = async (sectionId) => {
    if (!newSectionName.trim()) {
      alert('Название раздела не может быть пустым');
      return;
    }
    try {
      await apiService.updateSectionName(sectionId, newSectionName);
      await loadConfig();
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating section name:', error);
      alert('Ошибка при обновлении названия раздела');
    }
  };

  const handleAddSection = async () => {
    if (!newSectionNameInput.trim()) {
      alert('Введите название раздела');
      return;
    }
    try {
      await apiService.addSection(1, role || 'student', newSectionNameInput, headerColor);
      await loadConfig();
      setNewSectionNameInput('');
      setShowAddSection(false);
    } catch (error) {
      console.error('Error adding section:', error);
      alert('Ошибка при добавлении раздела');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Удалить этот раздел? Все блоки в разделе также будут удалены.')) return;
    
    try {
      await apiService.deleteSection(sectionId);
      await loadConfig();
      if (activeSectionId === sectionId) {
        setActiveSectionId(null);
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('Ошибка при удалении раздела');
    }
  };

  // Drag & Drop для разделов
  const handleSectionDragStart = (e, index) => {
    setDraggedSectionIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSectionDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedSectionIndex === null || draggedSectionIndex === dropIndex) {
      setDraggedSectionIndex(null);
      return;
    }

    const sections = [...config.sections];
    const [draggedSection] = sections.splice(draggedSectionIndex, 1);
    sections.splice(dropIndex, 0, draggedSection);

    const sectionIds = sections.map(s => s.id);
    try {
      await apiService.reorderSections(sectionIds);
      await loadConfig();
    } catch (error) {
      console.error('Error reordering sections:', error);
      alert('Ошибка при изменении порядка разделов');
    }

    setDraggedSectionIndex(null);
  };

  // ============ РАБОТА С БЛОКАМИ ============

  const handleHeaderColorChange = async (color) => {
    setHeaderColor(color);
    try {
      await apiService.updateHeaderColor(1, role || 'student', color);
    } catch (error) {
      console.error('Error updating header color:', error);
      alert('Ошибка при обновлении цвета хедера');
    }
  };

  const handleBlockDragStart = (e, index) => {
    setDraggedBlockIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBlockDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleBlockDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === dropIndex || !currentSection) return;

    const blocks = [...currentSection.blocks];
    const [draggedBlock] = blocks.splice(draggedBlockIndex, 1);
    blocks.splice(dropIndex, 0, draggedBlock);

    const blockIds = blocks.map(b => b.id);
    try {
      await apiService.reorderBlocks(blockIds);
      await loadConfig();
    } catch (error) {
      console.error('Error reordering blocks:', error);
      alert('Ошибка при изменении порядка блоков');
    }

    setDraggedBlockIndex(null);
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
        <div className="page-header" style={{ background: headerColor, color: 'white' }}>
          <button 
            onClick={() => navigate('/admin')}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
          >
            ← Назад
          </button>
          <h1 style={{ color: 'white', margin: 0 }}>Настройка: {role}</h1>
        </div>
        <div className="card">
          <p>Конфигурация не найдена. Создайте первый раздел.</p>
          <button onClick={() => setShowAddSection(true)} className="btn btn-primary">
            Создать раздел
          </button>
        </div>
      </div>
    );
  }

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

      {/* Настройка цвета хедера */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3>Цвет хедера</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="color"
            value={headerColor}
            onChange={(e) => handleHeaderColorChange(e.target.value)}
            style={{ width: '100px', height: '40px', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--max-border)' }}
          />
          <span>{headerColor}</span>
        </div>
      </div>

      {/* Управление разделами */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Разделы</h3>
          <button 
            onClick={() => setShowAddSection(!showAddSection)}
            className="btn btn-primary"
            style={{ padding: '8px 16px' }}
          >
            {showAddSection ? 'Отмена' : '+ Добавить раздел'}
          </button>
        </div>

        {showAddSection && (
          <div style={{ padding: '16px', background: 'var(--max-bg-secondary)', borderRadius: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Название раздела"
              value={newSectionNameInput}
              onChange={(e) => setNewSectionNameInput(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--max-border)', width: '100%', marginBottom: '8px' }}
            />
            <button onClick={handleAddSection} className="btn btn-primary">
              Создать раздел
            </button>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <h4>Перетащите разделы для изменения порядка:</h4>
          {config.sections.map((section, index) => (
            <DraggableSection
              key={section.id}
              section={section}
              index={index}
              onDragStart={handleSectionDragStart}
              onDragOver={handleSectionDragOver}
              onDrop={handleSectionDrop}
              onEdit={(id) => handleSectionNameEdit(id, section.name)}
              onDelete={handleDeleteSection}
              isActive={section.id === activeSectionId}
            />
          ))}
        </div>
      </div>

      {/* Управление блоками в активном разделе */}
      {currentSection && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>
              {editingSection === currentSection.id ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--max-border)' }}
                  />
                  <button onClick={() => saveSectionName(currentSection.id)} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                    Сохранить
                  </button>
                  <button onClick={() => setEditingSection(null)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                    Отмена
                  </button>
                </div>
              ) : (
                <>
                  Раздел: {currentSection.name}
                  <button
                    onClick={() => handleSectionNameEdit(currentSection.id, currentSection.name)}
                    className="btn btn-secondary"
                    style={{ marginLeft: '12px', padding: '4px 12px', fontSize: '12px' }}
                  >
                    ✏️ Редактировать
                  </button>
                </>
              )}
            </h3>
            <button
              onClick={() => setActiveSectionId(currentSection.id)}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Выбрать
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4>Блоки (перетащите для изменения порядка):</h4>
            {currentSection.blocks && currentSection.blocks.length > 0 ? (
              currentSection.blocks.map((block, index) => (
                <DraggableBlock
                  key={block.id}
                  block={block}
                  index={index}
                  onDragStart={handleBlockDragStart}
                  onDragOver={handleBlockDragOver}
                  onDrop={handleBlockDrop}
                  onDelete={handleDeleteBlock}
                />
              ))
            ) : (
              <p style={{ color: 'var(--max-text-secondary)', fontStyle: 'italic' }}>Нет блоков в этом разделе</p>
            )}
          </div>

          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--max-bg-secondary)', borderRadius: '8px' }}>
            <h4>Добавить блок в раздел "{currentSection.name}":</h4>
            <select
              id="blockTypeSelect"
              style={{ padding: '8px', marginRight: '8px', borderRadius: '4px', marginBottom: '8px', width: '100%' }}
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
                handleAddBlock(currentSection.id, blockType, blockNames[blockType]);
              }}
              className="btn btn-primary"
            >
              Добавить блок
            </button>
          </div>
        </div>
      )}

      {/* Выбор активного раздела */}
      {config.sections.length > 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <h3>Выберите раздел для редактирования:</h3>
          <div className="grid">
            {config.sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={`role-card ${activeSectionId === section.id ? 'active' : ''}`}
              >
                <div className="role-title">{section.name}</div>
                <div className="role-description">{section.blocks?.length || 0} блоков</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <UserSwitcher />
    </div>
  );
};

export default AdminConfigPage;
