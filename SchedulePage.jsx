import React, { useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Div,
  Title,
  Card,
  Text,
  Button
} from '@vkontakte/vkui';
import { Icon28CalendarOutline } from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';
import apiService from './api-service';

const SchedulePage = () => {
  const { showBackButton, hideBackButton, onBackButtonClick } = useMAXBridge();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    showBackButton();
    onBackButtonClick(() => {
      window.history.back();
    });

    return () => {
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, onBackButtonClick]);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const data = await apiService.getSchedule(date);
        setSchedule(data.schedule || []);
      } catch (error) {
        console.error('Error loading schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [date]);

  return (
    <Panel id="schedule">
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon28CalendarOutline />
          Расписание
        </div>
      </PanelHeader>
      <Group>
        <Div>
          <Title level="2" weight="bold" style={{ marginBottom: 16 }}>
            Расписание на {new Date(date).toLocaleDateString('ru-RU')}
          </Title>

          {loading ? (
            <Text>Загрузка расписания...</Text>
          ) : schedule.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {schedule.map((item) => (
                <Card key={item.id} mode="shadow">
                  <Div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text weight="semibold">{item.time}</Text>
                      <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                        {item.type}
                      </Text>
                    </div>
                    <Title level="3" style={{ marginBottom: 8 }}>
                      {item.subject}
                    </Title>
                    <Text style={{ marginBottom: 4 }}>
                      📍 {item.room}
                    </Text>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      👤 {item.teacher}
                    </Text>
                  </Div>
                </Card>
              ))}
            </div>
          ) : (
            <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
              На этот день расписания нет
            </Text>
          )}
        </Div>
      </Group>
    </Panel>
  );
};

export default SchedulePage;
