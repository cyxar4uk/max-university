import React, { useEffect } from 'react';
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
import { Icon28Users3Outline } from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';

const AdmissionPage = () => {
  const { showBackButton, hideBackButton, onBackButtonClick } = useMAXBridge();

  useEffect(() => {
    showBackButton();
    onBackButtonClick(() => {
      window.history.back();
    });

    return () => {
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, onBackButtonClick]);

  const programs = [
    { id: 1, name: 'Бакалавриат', description: 'Программы бакалавриата' },
    { id: 2, name: 'Магистратура', description: 'Программы магистратуры' },
    { id: 3, name: 'Аспирантура', description: 'Программы аспирантуры' }
  ];

  return (
    <Panel id="admission">
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon28Users3Outline />
          Поступление
        </div>
      </PanelHeader>
      <Group>
        <Div>
          <Title level="2" weight="bold" style={{ marginBottom: 16 }}>
            Информация о поступлении
          </Title>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {programs.map((program) => (
              <Card key={program.id} mode="shadow">
                <Div>
                  <Title level="3" style={{ marginBottom: 8 }}>
                    {program.name}
                  </Title>
                  <Text style={{ marginBottom: 12, color: 'var(--vkui--color_text_secondary)' }}>
                    {program.description}
                  </Text>
                  <Button size="m" mode="primary">
                    Подробнее
                  </Button>
                </Div>
              </Card>
            ))}
          </div>

          <Card mode="shadow">
            <Div>
              <Title level="3" style={{ marginBottom: 8 }}>
                Подать заявление
              </Title>
              <Text style={{ marginBottom: 12, color: 'var(--vkui--color_text_secondary)' }}>
                Подать заявление на поступление
              </Text>
              <Button size="m" mode="primary">
                Подать заявление
              </Button>
            </Div>
          </Card>
        </Div>
      </Group>
    </Panel>
  );
};

export default AdmissionPage;

