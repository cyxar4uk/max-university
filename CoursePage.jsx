import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Panel,
  PanelHeader,
  Group,
  Div,
  Title,
  Card,
  Text,
  Progress
} from '@vkontakte/vkui';
import { Icon28BookOutline } from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';
import apiService from './api-service';

const CoursePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showBackButton, hideBackButton, onBackButtonClick } = useMAXBridge();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    showBackButton();
    onBackButtonClick(() => {
      navigate('/home');
    });

    return () => {
      hideBackButton();
    };
  }, [navigate, showBackButton, hideBackButton, onBackButtonClick]);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const courses = await apiService.getCourses();
        const foundCourse = courses.courses?.find(c => c.id === parseInt(id));
        setCourse(foundCourse);
      } catch (error) {
        console.error('Error loading course:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadCourse();
    }
  }, [id]);

  if (loading) {
    return (
      <Panel>
        <PanelHeader>Загрузка...</PanelHeader>
        <Group>
          <Div>
            <Text>Загрузка информации о курсе...</Text>
          </Div>
        </Group>
      </Panel>
    );
  }

  if (!course) {
    return (
      <Panel>
        <PanelHeader>Курс не найден</PanelHeader>
        <Group>
          <Div>
            <Text>Курс с ID {id} не найден</Text>
          </Div>
        </Group>
      </Panel>
    );
  }

  return (
    <Panel id="course">
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon28BookOutline />
          {course.name}
        </div>
      </PanelHeader>
      <Group>
        <Div>
          <Title level="2" weight="bold" style={{ marginBottom: 16 }}>
            {course.name}
          </Title>

          <Card mode="shadow" style={{ marginBottom: 16 }}>
            <Div>
              <Text weight="medium" style={{ marginBottom: 8 }}>
                Прогресс прохождения
              </Text>
              <Progress value={course.progress} />
              <Text style={{ marginTop: 8, color: 'var(--vkui--color_text_secondary)' }}>
                {course.progress}% завершено
              </Text>
            </Div>
          </Card>

          <Card mode="shadow" style={{ marginBottom: 16 }}>
            <Div>
              <Text weight="medium" style={{ marginBottom: 8 }}>
                Задания
              </Text>
              <Text>
                Активных заданий: {course.assignments}
              </Text>
            </Div>
          </Card>

          <Card mode="shadow">
            <Div>
              <Text weight="medium" style={{ marginBottom: 8 }}>
                Следующее занятие
              </Text>
              <Text>
                {course.next_class}
              </Text>
            </Div>
          </Card>
        </Div>
      </Group>
    </Panel>
  );
};

export default CoursePage;
