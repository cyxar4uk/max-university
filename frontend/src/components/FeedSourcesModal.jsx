import React, { useEffect, useState } from 'react';
import apiService from '../api-service.js';

const STORAGE_KEY = 'hubFeedSelectedSources';

export function getStoredSources() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function setStoredSources(sources) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
}

/**
 * Модалка выбора источников ленты. Критичный функционал: пользователь выбирает,
 * из каких источников показывать новости (cold_news).
 */
const FeedSourcesModal = ({ isOpen, onClose, selectedSources, onSave }) => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(selectedSources);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(selectedSources);
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiService.getHubSources();
        setSources(data.sources || []);
      } catch (e) {
        setSources([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, selectedSources]);

  const toggle = (name) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleSave = () => {
    setStoredSources(selected);
    onSave(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="feed-sources-overlay" role="dialog" aria-modal="true" aria-label="Настроить источники ленты">
      <div className="feed-sources-backdrop" onClick={onClose} aria-hidden />
      <div className="feed-sources-modal">
        <div className="feed-sources-header">
          <h2 className="feed-sources-title">Источники ленты</h2>
          <button
            type="button"
            className="feed-sources-close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <p className="feed-sources-hint">
          Выберите, из каких источников показывать новости. Если ничего не выбрано — показываются все.
        </p>
        {loading ? (
          <div className="feed-sources-loading">Загрузка источников...</div>
        ) : sources.length === 0 ? (
          <div className="feed-sources-empty">
            <p>Источники пока недоступны.</p>
            <p className="feed-sources-empty-hint">Запустите сервис cold_news (feed-api) для настройки ленты.</p>
          </div>
        ) : (
          <ul className="feed-sources-list">
            {sources.map((name) => (
              <li key={name}>
                <label className="feed-sources-item">
                  <input
                    type="checkbox"
                    checked={selected.includes(name)}
                    onChange={() => toggle(name)}
                    className="feed-sources-checkbox"
                  />
                  <span className="feed-sources-item-name">{name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="feed-sources-footer">
          <button type="button" className="feed-sources-cancel" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="feed-sources-save" onClick={handleSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedSourcesModal;
