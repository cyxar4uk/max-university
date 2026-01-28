import React from 'react';
import ScheduleWidget from './ScheduleWidget.jsx';
import NewsWidget from './NewsWidget.jsx';
import ServicesWidget from './ServicesWidget.jsx';
import CoursesWidget from './CoursesWidget.jsx';
import EventsWidget from './EventsWidget.jsx';
import PaymentWidget from './PaymentWidget.jsx';
import AdmissionWidget from './AdmissionWidget.jsx';
import AnalyticsWidget from './AnalyticsWidget.jsx';

const BlockWidget = ({ block, apiService }) => {
  if (!block) {
    return <div className="widget">Блок не найден</div>;
  }

  switch (block.block_type) {
    case 'schedule':
      return <ScheduleWidget block={block} apiService={apiService} />;
    case 'news':
      return <NewsWidget block={block} apiService={apiService} />;
    case 'services':
      return <ServicesWidget block={block} apiService={apiService} />;
    case 'lms':
      return <CoursesWidget block={block} apiService={apiService} />;
    case 'life':
      return <EventsWidget block={block} apiService={apiService} />;
    case 'payment':
      return <PaymentWidget block={block} apiService={apiService} />;
    case 'admission':
      return <AdmissionWidget block={block} apiService={apiService} />;
    case 'analytics':
      return <AnalyticsWidget block={block} apiService={apiService} />;
    case 'config':
      return (
        <div className="widget">
          <div className="widget-header">
            <h3 className="widget-title">{block.name}</h3>
          </div>
          <div className="widget-content">
            <button className="button primary" onClick={() => window.location.href = '#/admin/config/admin'}>
              Открыть настройки
            </button>
          </div>
        </div>
      );
    case 'users':
      return (
        <div className="widget">
          <div className="widget-header">
            <h3 className="widget-title">{block.name}</h3>
          </div>
          <div className="widget-content">
            <p>Управление пользователями (в разработке)</p>
          </div>
        </div>
      );
    default:
      return (
        <div className="widget">
          <div className="widget-header">
            <h3 className="widget-title">{block.name}</h3>
          </div>
          <div className="widget-content widget-empty">
            <p>Неизвестный тип блока: {block.block_type}</p>
          </div>
        </div>
      );
  }
};

export default BlockWidget;

