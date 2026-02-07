import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Полноэкранный экран камеры для создания истории: фото/видео, галерея, переворот камеры, вспышка.
 * По завершении вызывает onCapture([file]) или onSelectFromGallery([file]).
 */
const StoryCameraScreen = ({ onClose, onCapture }) => {
  const [mode, setMode] = useState('photo'); // 'photo' | 'video'
  const [facingMode, setFacingMode] = useState('environment'); // 'user' | 'environment'
  const [flashOn, setFlashOn] = useState(false);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const galleryInputRef = useRef(null);
  const streamRef = useRef(null);

  const startStream = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setError(null);
    try {
      const constraints = {
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === 'video',
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      setError('Не удалось открыть камеру. Проверьте доступ.');
    }
  }, [facingMode, mode]);

  useEffect(() => {
    startStream();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [startStream]);

  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !stream) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `story-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture([file]);
      },
      'image/jpeg',
      0.92
    );
  };

  const startRecording = () => {
    if (!stream) return;
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 2500000 });
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], `story-${Date.now()}.webm`, { type: 'video/webm' });
      onCapture([file]);
    };
    recorder.start(200);
    mediaRecorderRef.current = recorder;
    setRecordedChunks(chunks);
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleShutter = () => {
    if (mode === 'photo') capturePhoto();
    else if (recording) stopRecording();
    else startRecording();
  };

  const handleGalleryClick = () => galleryInputRef.current?.click();

  const handleGalleryChange = (e) => {
    const files = e.target?.files;
    if (files?.length) {
      const arr = Array.from(files).slice(0, 1);
      if (arr[0]) onCapture([arr[0]]);
    }
    e.target.value = '';
  };

  return (
    <div className="story-camera-screen">
      <header className="story-camera-header">
        <button type="button" className="story-camera-btn story-camera-back" onClick={onClose} aria-label="Назад">
          ←
        </button>
        <button
          type="button"
          className="story-camera-btn story-camera-flash"
          onClick={() => setFlashOn((f) => !f)}
          aria-label={flashOn ? 'Выключить вспышку' : 'Включить вспышку'}
          title={flashOn ? 'Вспышка вкл' : 'Вспышка выкл'}
        >
          {flashOn ? '✦' : '✧'}
        </button>
      </header>

      <div className="story-camera-viewfinder">
        {error && <p className="story-camera-error">{error}</p>}
        {!error && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`story-camera-video ${facingMode === 'user' ? 'user-facing' : ''}`}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        )}
      </div>

      <div className="story-camera-controls">
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          capture={undefined}
          style={{ display: 'none' }}
          onChange={handleGalleryChange}
        />
        <button
          type="button"
          className="story-camera-gallery"
          onClick={handleGalleryClick}
          aria-label="Выбрать из галереи"
        >
          <span className="story-camera-gallery-icon">▦</span>
        </button>

        <button
          type="button"
          className={`story-camera-shutter ${recording ? 'story-camera-shutter--recording' : ''}`}
          onClick={handleShutter}
          disabled={!!error}
          aria-label={mode === 'photo' ? 'Сделать фото' : recording ? 'Остановить запись' : 'Начать запись'}
        />

        <button
          type="button"
          className="story-camera-btn story-camera-flip"
          onClick={switchCamera}
          aria-label="Перевернуть камеру"
        >
          ⟲
        </button>
      </div>

      <div className="story-camera-modes">
        <button
          type="button"
          className={`story-camera-mode ${mode === 'photo' ? 'story-camera-mode--active' : ''}`}
          onClick={() => setMode('photo')}
        >
          Фото
        </button>
        <button
          type="button"
          className={`story-camera-mode ${mode === 'video' ? 'story-camera-mode--active' : ''}`}
          onClick={() => setMode('video')}
        >
          Видео
        </button>
      </div>
    </div>
  );
};

export default StoryCameraScreen;
