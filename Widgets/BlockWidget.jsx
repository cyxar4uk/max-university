import React from 'react';
import ScheduleWidget from './ScheduleWidget';
import NewsWidget from './NewsWidget';
import ServicesWidget from './ServicesWidget';
import CoursesWidget from './CoursesWidget';
import EventsWidget from './EventsWidget';
import PaymentWidget from './PaymentWidget';
import AdmissionWidget from './AdmissionWidget';
import AnalyticsWidget from './AnalyticsWidget';

const BlockWidget = ({ blockType }) => {
  switch (blockType) {
    case 'schedule':
      return <ScheduleWidget />;
    case 'news':
      return <NewsWidget />;
    case 'services':
      return <ServicesWidget />;
    case 'lms':
      return <CoursesWidget />;
    case 'life':
      return <EventsWidget />;
    case 'payment':
      return <PaymentWidget />;
    case 'admission':
      return <AdmissionWidget />;
    case 'analytics':
      return <AnalyticsWidget />;
    default:
      return <div className="widget">Неизвестный тип блока: {blockType}</div>;
  }
};

export default BlockWidget;

