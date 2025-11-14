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
import { Icon28NewsfeedOutline } from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';
import apiService from './api-service';

const EventsPage = () => {
  const { showBackButton, hideBackButton, onBackButtonClick } = useMAXBridge();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const loadEvents = async () => {
      try {
        const data = await apiService.getEvents();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const handleRegister = async (eventId) => {
    try {
      await apiService.registerForEvent(eventId);
      alert('Вы успешно зарегистрированы на событие!');
    } catch (error) {
      console.error('Error registering for event:', error);
      alert('Ошибка при регистрации');
    }
  };

  return (
    <Panel id="events">
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon28NewsfeedOutline />
          События
        </div>
      </PanelHeader>
      <Group>
        <Div>
          <Title level="2" weight="bold" style={{ marginBottom: 16 }}>
            События университета
          </Title>

          {loading ? (
            <Text>Загрузка событий...</Text>
          ) : events.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map((event) => (
                <Card key={event.id} mode="shadow">
                  <Div>
                    <Title level="3" style={{ marginBottom: 8 }}>
                      {event.title}
                    </Title>
                    <Text style={{ marginBottom: 8 }}>
                      📅 {event.date} в {event.time}
                    </Text>
                    <Text style={{ marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>
                      📍 {event.location}
                    </Text>
                    <Text style={{ marginBottom: 12, color: 'var(--vkui--color_text_secondary)' }}>
                      👥 Участников: {event.participants}
                    </Text>
                    <Button size="m" mode="primary" onClick={() => handleRegister(event.id)}>
                      Зарегистрироваться
                    </Button>
                  </Div>
                </Card>
              ))}
            </div>
          ) : (
            <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
              Нет доступных событий
            </Text>
          )}
        </Div>
      </Group>
    </Panel>
  );
};

export default EventsPage;

