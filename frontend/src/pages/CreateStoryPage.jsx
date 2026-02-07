import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Panel, Button, Typography, Flex } from '@maxhub/max-ui';
import apiService from '../api-service.js';

/**
 * Создание истории: добавление слайдов (фото, видео, текст), загрузка медиа, публикация.
 */
const CreateStoryPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [slides, setSlides] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1', 10);

  const addSlide = (type, payload = {}) => {
    setSlides((prev) => [...prev, { type, ...payload }]);
    setError(null);
  };

  const handleFileSelect = async (e, type) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const data = await apiService.uploadStoryMedia(file);
      if (data.media_url) {
        addSlide(type, { media_url: data.media_url, preview: URL.createObjectURL(file) });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddPhoto = () => fileInputRef.current?.click();
  const handleAddVideo = () => videoInputRef.current?.click();

  const removeSlide = (index) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTextSlide = (index, text) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, text } : s)));
  };

  const handlePublish = async () => {
    if (!slides.length) {
      setError('Добавьте хотя бы один слайд');
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const payload = slides.map((s) => ({
        type: s.type,
        media_url: s.media_url || null,
        text: s.text || null,
        duration_sec: s.duration_sec ?? null,
      }));
      await apiService.createStory(payload, universityId);
      navigate('/profile?tab=stories');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка публикации');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Panel mode="secondary" className="create-story-page">
      <header className="create-story-header">
        <Button mode="tertiary" appearance="neutral" size="small" onClick={() => navigate(-1)}>
          Назад
        </Button>
        <Typography.Headline variant="medium">Новая история</Typography.Headline>
        <div />
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e, 'video')}
      />

      <div className="create-story-actions">
        <Button mode="secondary" appearance="neutral" onClick={handleAddPhoto} disabled={uploading}>
          Фото
        </Button>
        <Button mode="secondary" appearance="neutral" onClick={handleAddVideo} disabled={uploading}>
          Видео
        </Button>
        <Button mode="secondary" appearance="neutral" onClick={() => addSlide('text', { text: '' })}>
          Текст
        </Button>
      </div>

      {error && <p className="create-story-error">{error}</p>}

      <Flex direction="column" gap={12} className="create-story-slides">
        {slides.map((slide, index) => (
          <div key={index} className="create-story-slide">
            {slide.type === 'image' && slide.preview && (
              <img src={slide.preview} alt="" className="create-story-slide-preview" />
            )}
            {slide.type === 'video' && slide.preview && (
              <video src={slide.preview} className="create-story-slide-preview" controls muted />
            )}
            {slide.type === 'text' && (
              <input
                type="text"
                className="create-story-text-input"
                placeholder="Текст слайда"
                value={slide.text || ''}
                onChange={(e) => updateTextSlide(index, e.target.value)}
              />
            )}
            <span className="create-story-slide-type">{slide.type === 'image' ? 'Фото' : slide.type === 'video' ? 'Видео' : 'Текст'}</span>
            <Button mode="tertiary" appearance="negative" size="small" onClick={() => removeSlide(index)}>
              Удалить
            </Button>
          </div>
        ))}
      </Flex>

      <div className="create-story-footer">
        <Button
          mode="primary"
          appearance="themed"
          stretched
          onClick={handlePublish}
          disabled={!slides.length || publishing}
          loading={publishing}
        >
          Опубликовать
        </Button>
      </div>
    </Panel>
  );
};

export default CreateStoryPage;
