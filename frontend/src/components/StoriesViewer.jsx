import React, { useState, useEffect, useCallback } from 'react';

const SLIDE_DURATION_MS = 4500;

/**
 * Полноэкранный просмотр сторис.
 * stories — массив историй { id, authorName, avatarUrl?, slides: [ { type, text?|url? } ] }.
 * startStoryIndex — с какой истории начать (0).
 * onClose — вызвать при закрытии.
 */
const StoriesViewer = ({ stories = [], startStoryIndex = 0, onClose }) => {
  const [storyIndex, setStoryIndex] = useState(Math.min(startStoryIndex, Math.max(0, stories.length - 1)));
  const [slideIndex, setSlideIndex] = useState(0);

  const currentStory = stories[storyIndex] || null;
  const slides = currentStory?.slides || [];
  const currentSlide = slides[slideIndex] || null;

  const goNext = useCallback(() => {
    if (slideIndex < slides.length - 1) {
      setSlideIndex((i) => i + 1);
    } else if (storyIndex < stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setSlideIndex(0);
    } else {
      onClose?.();
    }
  }, [slideIndex, slides.length, storyIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (slideIndex > 0) {
      setSlideIndex((i) => i - 1);
    } else if (storyIndex > 0) {
      const prevStory = stories[storyIndex - 1];
      setStoryIndex((i) => i - 1);
      setSlideIndex(prevStory?.slides?.length ? prevStory.slides.length - 1 : 0);
    }
  }, [slideIndex, storyIndex, stories]);

  useEffect(() => {
    if (!currentSlide) return;
    const t = setTimeout(goNext, SLIDE_DURATION_MS);
    return () => clearTimeout(t);
  }, [storyIndex, slideIndex, currentSlide, goNext]);

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
            <div key={i} className="stories-viewer-progress-track">
              <div
                className="stories-viewer-progress-fill"
                style={{
                  width: i < slideIndex ? '100%' : i === slideIndex ? '0%' : '0%',
                  animation: i === slideIndex ? `stories-progress ${SLIDE_DURATION_MS}ms linear forwards` : 'none',
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
          <span className="stories-viewer-author">{currentStory.authorName}</span>
        </div>

        <div className="stories-viewer-slide">
          {currentSlide?.type === 'image' && currentSlide.url && (
            <img src={currentSlide.url} alt={currentSlide.caption || ''} className="stories-viewer-slide-img" />
          )}
          {currentSlide?.type === 'text' && (
            <p className="stories-viewer-slide-text">{currentSlide.text}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoriesViewer;
