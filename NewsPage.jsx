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
import { Icon28NewsfeedOutline } from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';
import apiService from './api-service';

const NewsPage = () => {
  const { showBackButton, hideBackButton, onBackButtonClick } = useMAXBridge();
  const [news, setNews] = useState([]);
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
    const loadNews = async () => {
      try {
        const data = await apiService.getNews();
        setNews(data.news || []);
      } catch (error) {
        console.error('Error loading news:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  return (
    <Panel id="news">
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon28NewsfeedOutline />
          Новости
        </div>
      </PanelHeader>
      <Group>
        <Div>
          <Title level="2" weight="bold" style={{ marginBottom: 16 }}>
            Новости университета
          </Title>

          {loading ? (
            <Text>Загрузка новостей...</Text>
          ) : news.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {news.map((item) => (
                <Card key={item.id} mode="shadow">
                  <Div>
                    <div style={{ 
                      marginBottom: 8, 
                      padding: '4px 8px', 
                      backgroundColor: 'var(--vkui--color_background_secondary)', 
                      borderRadius: 4,
                      display: 'inline-block'
                    }}>
                      <Text style={{ fontSize: 12, textTransform: 'uppercase' }}>
                        {item.category}
                      </Text>
                    </div>
                    <Title level="3" style={{ marginBottom: 8 }}>
                      {item.title}
                    </Title>
                    <Text style={{ marginBottom: 8 }}>
                      {item.content}
                    </Text>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
                      📅 {item.date}
                    </Text>
                  </Div>
                </Card>
              ))}
            </div>
          ) : (
            <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
              Нет новостей
            </Text>
          )}
        </Div>
      </Group>
    </Panel>
  );
};

export default NewsPage;

