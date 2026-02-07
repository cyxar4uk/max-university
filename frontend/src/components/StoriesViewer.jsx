import React, { useState, useEffect, useCallback, useRef } from 'react';

const SLIDE_DURATION_MS = 4500;

/** Формат времени истории для шапки */
function formatStoryTime(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (dDate.getTime() === today.getTime()) return `сегодня в ${timeStr}`;
  if (dDate.getTime() === yesterday.getTime()) return `вчера в ${timeStr}`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Полноэкранный просмотр сторис.
 * stories — массив { id, authorName, avatarUrl?, slides, created_at?, reaction_count?, user_reacted? }.
 * storyId — id текущей истории (для record view).
 * onViewRecorded(storyId), onReaction(storyId) — опционально.
 */
const StoriesViewer = ({ stories = [], startStoryIndex = 0, onClose, storyId, onViewRecorded, onReaction }) => {
  const [storyIndex, setStoryIndex] = useState(Math.min(startStoryIndex, Math.max(0, stories.length - 1)));
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const videoRef = useRef(null);
  const viewRecordedRef = useRef(false);

  const currentStory = stories[storyIndex] || null;
  const slides = currentStory?.slides || [];
  const currentSlide = slides[slideIndex] || null;
  const isVideo = currentSlide?.type === 'video';
  const durationMs = isVideo && currentSlide?.duration_sec != null
    ? Math.round(currentSlide.duration_sec * 1000)
    : SLIDE_DURATION_MS;

  const goNext = useCallback(() => {
    if (slideIndex < slides.length - 1) {
      setSlideIndex((i) => i + 1);
      setProgressKey((k) => k + 1);
    } else if (storyIndex < stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setSlideIndex(0);
      setProgressKey((k) => k + 1);
    } else {
      onClose?.();
    }
  }, [slideIndex, slides.length, storyIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (slideIndex > 0) {
      setSlideIndex((i) => i - 1);
      setProgressKey((k) => k + 1);
    } else if (storyIndex > 0) {
      const prevStory = stories[storyIndex - 1];
      setStoryIndex((i) => i - 1);
      setSlideIndex(prevStory?.slides?.length ? prevStory.slides.length - 1 : 0);
      setProgressKey((k) => k + 1);
    }
  }, [slideIndex, storyIndex, stories]);

  useEffect(() => {
    if (storyId && onViewRecorded && !viewRecordedRef.current) {
      viewRecordedRef.current = true;
      onViewRecorded(storyId);
    }
  }, [storyId, onViewRecorded]);

  useEffect(() => {
    if (!currentSlide || paused) return;
    if (isVideo && videoRef.current) {
      const v = videoRef.current;
      const onEnd = () => goNext();
      v.addEventListener('ended', onEnd);
      return () => v.removeEventListener('ended', onEnd);
    }
    const t = setTimeout(goNext, durationMs);
    return () => clearTimeout(t);
  }, [storyIndex, slideIndex, currentSlide, goNext, paused, isVideo, durationMs]);

  if (!currentStory) {
    onClose?.();
    return null;
  }

  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) goNext();
    else goPrev();
  };

  const handleVideoWaiting = () => setPaused(true);
  const handleVideoPlaying = () => setPaused(false);

  return (
    <div className="stories-viewer" role="dialog" aria-label="Сторис">
      <div className="stories-viewer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="stories-viewer-inner" onClick={handleTap}>
        <button
          type="button"
          className="stories-viewer-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className="stories-viewer-progress">
          {slides.map((_, i) => (
            <div key={`${progressKey}-${i}`} className="stories-viewer-progress-track">
              <div
                className="stories-viewer-progress-fill"
                style={{
                  width: i < slideIndex ? '100%' : i === slideIndex ? '0%' : '0%',
                  animation: i === slideIndex && !paused ? `stories-progress ${durationMs}ms linear forwards` : 'none',
                }}
              />
            </div>
          ))}
        </div>

        <div className="stories-viewer-header">
          <span className="stories-viewer-avatar">
            {currentStory.avatarUrl ? (
              <img src={currentStory.avatarUrl} alt="" />
            ) : (
              (currentStory.authorName || '?').charAt(0).toUpperCase()
            )}
          </span>
          <div className="stories-viewer-header-info">
            <span className="stories-viewer-author">{currentStory.authorName}</span>
            {currentStory.created_at && (
              <span className="stories-viewer-time">{formatStoryTime(currentStory.created_at)}</span>
            )}
          </div>
        </div>

        <div className="stories-viewer-slide">
          {currentSlide?.type === 'image' && currentSlide.url && (
            <img src={currentSlide.url} alt={currentSlide.caption || ''} className="stories-viewer-slide-img" />
          )}
          {currentSlide?.type === 'video' && currentSlide.url && (
            <video
              ref={videoRef}
              src={currentSlide.url}
              className="stories-viewer-slide-video"
              playsInline
              autoPlay
              muted
              onWaiting={handleVideoWaiting}
              onPlaying={handleVideoPlaying}
            />
          )}
          {currentSlide?.type === 'text' && (
            <p className="stories-viewer-slide-text">{currentSlide.text}</p>
          )}
        </div>

        {onReaction && (
          <div className="stories-viewer-footer">
            <button
              type="button"
              className={`stories-viewer-reaction ${currentStory.user_reacted ? 'stories-viewer-reaction--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onReaction(currentStory.id); }}
              aria-label="Реакция"
            >
              ♥
            </button>
            <span className="stories-viewer-reaction-count">{currentStory.reaction_count ?? 0}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoriesViewer;
