import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Panel, Button, Typography } from '@maxhub/max-ui';
import apiService from '../api-service.js';
import StoryCameraScreen from '../components/StoryCameraScreen.jsx';

const CreateStoryPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [step, setStep] = useState('camera'); // 'camera' | 'editor'
  const [slides, setSlides] = useState([]); // [{ type, file, preview, text }] from camera
  const [caption, setCaption] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [showOverlayModal, setShowOverlayModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const universityId = user.universityId || parseInt(localStorage.getItem('universityId') || '1', 10);

  const handleCapture = (files) => {
    if (!files?.length) return;
    const newSlides = files.map((f) => ({
      type: f.type.startsWith('video/') ? 'video' : 'image',
      file: f,
      preview: URL.createObjectURL(f),
      text: '',
    }));
    setSlides(newSlides);
    setCaption('');
    setOverlayText('');
    setStep('editor');
  };

  const backToCamera = () => {
    slides.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
    setSlides([]);
    setStep('camera');
    setError(null);
  };

  const addTextOnPhoto = () => {
    setShowOverlayModal(true);
  };

  const applyOverlayText = () => {
    if (!overlayText.trim() || slides.length === 0 || slides[0].type !== 'image') {
      setShowOverlayModal(false);
      setOverlayText('');
      return;
    }
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) {
      setShowOverlayModal(false);
      setOverlayText('');
      return;
    }
    const ctx = canvas.getContext('2d');
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) {
      setShowOverlayModal(false);
      setOverlayText('');
      return;
    }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0);
    ctx.font = `bold ${Math.max(24, Math.floor(w / 15))}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = w / 2;
    const y = h / 2;
    ctx.strokeText(overlayText.trim(), x, y);
    ctx.fillText(overlayText.trim(), x, y);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `story-overlay-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const prev = slides[0].preview;
        if (prev) URL.revokeObjectURL(prev);
        setSlides([
          {
            ...slides[0],
            file,
            preview: URL.createObjectURL(blob),
          },
        ]);
        setShowOverlayModal(false);
        setOverlayText('');
      },
      'image/jpeg',
      0.92
    );
  };

  const getVideoDuration = (file) =>
    new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        resolve(v.duration);
        v.src = '';
      };
      v.src = URL.createObjectURL(file);
    });

  const handlePublish = async () => {
    if (!slides.length) {
      setError('Добавьте медиа');
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const payload = [];
      for (const s of slides) {
        setUploading(true);
        const uploadRes = await apiService.uploadStoryMedia(s.file);
        setUploading(false);
        let duration_sec = null;
        if (s.type === 'video') {
          try {
            duration_sec = await getVideoDuration(s.file);
          } catch (_) {}
        }
        payload.push({
          type: s.type,
          media_url: uploadRes.media_url,
          text: s === slides[0] ? caption || null : s.text || null,
          duration_sec,
        });
      }
      await apiService.createStory(payload, universityId);
      slides.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
      navigate('/profile?tab=stories');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка публикации');
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    return () => {
      slides.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
    };
  }, []);

  if (step === 'camera') {
    return (
      <StoryCameraScreen
        onClose={() => navigate(-1)}
        onCapture={handleCapture}
      />
    );
  }

  const firstSlide = slides[0];
  const isImage = firstSlide?.type === 'image';

  return (
    <Panel mode="secondary" className="story-editor-page create-story-page">
      <header className="create-story-header">
        <Button mode="tertiary" appearance="neutral" size="small" onClick={backToCamera}>
          Назад
        </Button>
        <Typography.Headline variant="medium">Новая история</Typography.Headline>
        <div />
      </header>

      <div className="story-editor-preview-wrap">
        {firstSlide?.type === 'image' && (
          <>
            <img
              ref={imgRef}
              src={firstSlide.preview}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        )}
        {firstSlide?.type === 'video' && (
          <video
            src={firstSlide.preview}
            controls
            muted
            style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain' }}
          />
        )}
      </div>

      <div className="story-editor-caption-row">
        <input
          type="text"
          className="story-editor-caption-input"
          placeholder="Добавить подпись..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        {isImage && (
          <button type="button" className="story-editor-add-text-btn" onClick={addTextOnPhoto}>
            Текст на фото
          </button>
        )}
      </div>

      {error && <p className="create-story-error">{error}</p>}

      <div className="story-editor-footer create-story-footer">
        <Button
          mode="primary"
          appearance="themed"
          stretched
          onClick={handlePublish}
          disabled={!slides.length || publishing || uploading}
          loading={publishing || uploading}
          className="story-editor-btn-next"
        >
          {uploading ? 'Загрузка…' : publishing ? 'Публикация…' : 'Опубликовать'}
        </Button>
      </div>

      {showOverlayModal && (
        <div className="story-overlay-modal-backdrop" onClick={() => { setShowOverlayModal(false); setOverlayText(''); }}>
          <div className="story-overlay-modal" onClick={(e) => e.stopPropagation()}>
            <Typography.Headline variant="small">Текст на фото</Typography.Headline>
            <input
              type="text"
              className="story-editor-caption-input"
              placeholder="Введите текст..."
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button mode="secondary" appearance="neutral" onClick={() => { setShowOverlayModal(false); setOverlayText(''); }}>
                Отмена
              </Button>
              <Button mode="primary" appearance="themed" onClick={applyOverlayText}>
                Применить
              </Button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};

export default CreateStoryPage;
