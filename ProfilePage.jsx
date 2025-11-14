import React, { useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Div,
  Title,
  Card,
  Text,
  Avatar
} from '@vkontakte/vkui';
import { Icon28UserOutline } from '@vkontakte/icons';
import { useMAXBridge } from './useMAXBridge';
import { useSelector } from 'react-redux';

const ProfilePage = () => {
  const { userInfo, showBackButton, hideBackButton, onBackButtonClick } = useMAXBridge();
  const user = useSelector((state) => state.user);

  useEffect(() => {
    showBackButton();
    onBackButtonClick(() => {
      window.history.back();
    });

    return () => {
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, onBackButtonClick]);

  const roleNames = {
    student: 'Студент',
    applicant: 'Абитуриент',
    employee: 'Сотрудник',
    admin: 'Администратор'
  };

  return (
    <Panel id="profile">
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon28UserOutline />
          Профиль
        </div>
      </PanelHeader>
      <Group>
        <Div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            marginBottom: 24 
          }}>
            <Avatar
              size={96}
              src={userInfo?.photo_url || user.photoUrl}
              style={{ marginBottom: 16 }}
            />
            <Title level="1" weight="bold">
              {userInfo?.first_name || user.firstName} {userInfo?.last_name || user.lastName}
            </Title>
            {user.role && (
              <Text style={{ 
                marginTop: 8, 
                color: 'var(--vkui--color_text_secondary)' 
              }}>
                {roleNames[user.role] || user.role}
              </Text>
            )}
          </div>

          <Card mode="shadow" style={{ marginBottom: 12 }}>
            <Div>
              <Text weight="medium" style={{ marginBottom: 8 }}>
                ID пользователя
              </Text>
              <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                {userInfo?.id || user.maxUserId}
              </Text>
            </Div>
          </Card>

          {user.username && (
            <Card mode="shadow" style={{ marginBottom: 12 }}>
              <Div>
                <Text weight="medium" style={{ marginBottom: 8 }}>
                  Username
                </Text>
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                  @{user.username}
                </Text>
              </Div>
            </Card>
          )}

          {user.languageCode && (
            <Card mode="shadow">
              <Div>
                <Text weight="medium" style={{ marginBottom: 8 }}>
                  Язык
                </Text>
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                  {user.languageCode}
                </Text>
              </Div>
            </Card>
          )}
        </Div>
      </Group>
    </Panel>
  );
};

export default ProfilePage;
