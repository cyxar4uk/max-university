import React, { useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Div,
  Title,
  Card,
  Text
} from '@vkontakte/vkui';
import { Icon28ChartOutline } from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';
import apiService from './api-service';

const AdminPage = () => {
  const { showBackButton, hideBackButton, onBackButtonClick } = useMAXBridge();
  const [statistics, setStatistics] = useState(null);
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
    const loadStatistics = async () => {
      try {
        const data = await apiService.getStatistics();
        setStatistics(data);
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  return (
    <Panel id="admin">
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon28ChartOutline />
          Панель администратора
        </div>
      </PanelHeader>
      <Group>
        <Div>
          <Title level="2" weight="bold" style={{ marginBottom: 16 }}>
            Статистика университета
          </Title>

          {loading ? (
            <Text>Загрузка статистики...</Text>
          ) : statistics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card mode="shadow">
                <Div>
                  <Text weight="medium" style={{ marginBottom: 8 }}>
                    Всего пользователей
                  </Text>
                  <Title level="1" weight="bold">
                    {statistics.total_users}
                  </Title>
                </Div>
              </Card>

              <Card mode="shadow">
                <Div>
                  <Text weight="medium" style={{ marginBottom: 8 }}>
                    Активных студентов
                  </Text>
                  <Title level="1" weight="bold">
                    {statistics.active_students}
                  </Title>
                </Div>
              </Card>

              <Card mode="shadow">
                <Div>
                  <Text weight="medium" style={{ marginBottom: 8 }}>
                    Преподавателей
                  </Text>
                  <Title level="1" weight="bold">
                    {statistics.faculty_members}
                  </Title>
                </Div>
              </Card>

              <Card mode="shadow">
                <Div>
                  <Text weight="medium" style={{ marginBottom: 8 }}>
                    Событий в этом месяце
                  </Text>
                  <Title level="1" weight="bold">
                    {statistics.events_this_month}
                  </Title>
                </Div>
              </Card>

              <Card mode="shadow">
                <Div>
                  <Text weight="medium" style={{ marginBottom: 8 }}>
                    Средний GPA
                  </Text>
                  <Title level="1" weight="bold">
                    {statistics.average_gpa}
                  </Title>
                </Div>
              </Card>
            </div>
          ) : (
            <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
              Не удалось загрузить статистику
            </Text>
          )}
        </Div>
      </Group>
    </Panel>
  );
};

export default AdminPage;
