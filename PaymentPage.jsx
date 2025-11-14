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
import { Icon28MoneyCircleOutline } from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';

const PaymentPage = () => {
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

  return (
    <Panel id="payment">
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon28MoneyCircleOutline />
          Оплата
        </div>
      </PanelHeader>
      <Group>
        <Div>
          <Title level="2" weight="bold" style={{ marginBottom: 16 }}>
            Оплата услуг
          </Title>

          <Card mode="shadow" style={{ marginBottom: 12 }}>
            <Div>
              <Text weight="medium" style={{ marginBottom: 8 }}>
                Обучение
              </Text>
              <Text style={{ marginBottom: 12, color: 'var(--vkui--color_text_secondary)' }}>
                Оплата за семестр
              </Text>
              <Button size="m" mode="primary">
                Оплатить
              </Button>
            </Div>
          </Card>

          <Card mode="shadow" style={{ marginBottom: 12 }}>
            <Div>
              <Text weight="medium" style={{ marginBottom: 8 }}>
                Вступительные взносы
              </Text>
              <Text style={{ marginBottom: 12, color: 'var(--vkui--color_text_secondary)' }}>
                Оплата вступительных экзаменов
              </Text>
              <Button size="m" mode="primary">
                Оплатить
              </Button>
            </Div>
          </Card>

          <Card mode="shadow">
            <Div>
              <Text weight="medium" style={{ marginBottom: 8 }}>
                Прочие услуги
              </Text>
              <Text style={{ marginBottom: 12, color: 'var(--vkui--color_text_secondary)' }}>
                Оплата дополнительных услуг
              </Text>
              <Button size="m" mode="primary">
                Оплатить
              </Button>
            </Div>
          </Card>
        </Div>
      </Group>
    </Panel>
  );
};

export default PaymentPage;

