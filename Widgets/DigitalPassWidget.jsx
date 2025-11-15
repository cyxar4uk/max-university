import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const DigitalPassWidget = () => {
  const [qrData, setQrData] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Получаем ID пользователя
    const user = window.WebApp?.initDataUnsafe?.user;
    const maxUserId = user?.id || localStorage.getItem('maxUserId') || '12345';
    setUserId(maxUserId);

    const generateQR = () => {
      // Генерируем уникальный токен для пропуска
      const timestamp = Date.now();
      const token = `${maxUserId}_${timestamp}`;
      setQrData(token);
      setTimeLeft(60);
    };

    generateQR();

    // Обновляем QR-код каждую минуту
    const interval = setInterval(() => {
      generateQR();
    }, 60000);

    // Обновляем таймер каждую секунду
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateQR();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="digital-pass-modal">
      <div className="digital-pass-content">
        <h2>Цифровой пропуск</h2>
        <div className="qr-code-container">
          {qrData && (
            <QRCodeSVG 
              value={qrData} 
              size={200}
              level="H"
              includeMargin={true}
            />
          )}
        </div>
        <div className="qr-timer">
          <div className="timer-label">Обновление через:</div>
          <div className="timer-value">{formatTime(timeLeft)}</div>
        </div>
        <div className="qr-instructions">
          <p>Покажите QR-код на турникете при входе в кампус</p>
          <p className="qr-note">Код действителен 1 минуту</p>
        </div>
      </div>
    </div>
  );
};

export default DigitalPassWidget;

