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
import { Icon28DocumentOutline } from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';

const ServicesPage = () => {
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

  const services = [
    { id: 1, name: 'Заказ справки', description: 'Заказать справку с места учебы/работы' },
    { id: 2, name: 'Подача заявления', description: 'Подать заявление на различные услуги' },
    { id: 3, name: 'Оплата', description: 'Оплата обучения и услуг' },
    { id: 4, name: 'Пропуск', description: 'Заказ гостевого пропуска' }
  ];

  return (
    <Panel id="services">
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon28DocumentOutline />
          Электронные услуги
        </div>
      </PanelHeader>
      <Group>
        <Div>
          <Title level="2" weight="bold" style={{ marginBottom: 16 }}>
            Доступные услуги
          </Title>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {services.map((service) => (
              <Card key={service.id} mode="shadow">
                <Div>
                  <Title level="3" style={{ marginBottom: 8 }}>
                    {service.name}
                  </Title>
                  <Text style={{ marginBottom: 12, color: 'var(--vkui--color_text_secondary)' }}>
                    {service.description}
                  </Text>
                  <Button size="m" mode="primary">
                    Заказать
                  </Button>
                </Div>
              </Card>
            ))}
          </div>
        </Div>
      </Group>
    </Panel>
  );
};

export default ServicesPage;

