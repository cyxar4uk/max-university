import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Panel,
  Container,
  Flex,
  Avatar,
  Typography,
  CellList,
  CellHeader,
  CellSimple,
  CellAction,
  Button,
} from '@maxhub/max-ui';
import { useMAXBridge } from '../useMAXBridge.js';
import { getDisplayUser } from '../utils/displayUser.js';
import UserSwitcher from '../UserSwitcher.jsx';

const roleNames = {
  student: 'Студент',
  applicant: 'Абитуриент',
  employee: 'Сотрудник',
  teacher: 'Учитель',
  admin: 'Администратор',
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const { displayName, avatarUrl } = getDisplayUser(userInfo, user);

  const currentRoleLabel = user.role ? (roleNames[user.role] || user.role) : null;
  const initial = (displayName || 'П').charAt(0).toUpperCase();

  return (
    <Panel mode="secondary" className="profile-page-panel">
      <header className="profile-page-header">
        <Button
          mode="tertiary"
          appearance="neutral"
          size="small"
          className="profile-page-back"
          onClick={() => navigate(-1)}
          aria-label="Назад"
        >
          ‹
        </Button>
      </header>

      <Container className="profile-page-hero">
        <Flex direction="column" align="center" gap={16}>
          <Avatar.Container size={96} form="circle" className="profile-page-avatar-wrap">
            {avatarUrl ? (
              <Avatar.Image src={avatarUrl} alt="" fallback={initial} />
            ) : (
              <Avatar.Text gradient="blue">{initial}</Avatar.Text>
            )}
          </Avatar.Container>
          <Flex direction="column" align="center" gap={4}>
            <Typography.Headline variant="large-strong">{displayName}</Typography.Headline>
            {currentRoleLabel && (
              <Typography.Body variant="small" className="profile-page-role">
                {currentRoleLabel}
              </Typography.Body>
            )}
          </Flex>
        </Flex>
      </Container>

      <Flex direction="column" gap={16} className="profile-page-sections">
        {/* Общая информация */}
        <CellList
          mode="island"
          header={
            <CellHeader
              after={
                <Button mode="tertiary" appearance="themed" size="small" onClick={() => {}}>
                  Изменить
                </Button>
              }
            >
              Общая информация
            </CellHeader>
          }
        >
          <CellSimple height="compact" title="Университет" subtitle="РАНХиГС" showChevron />
          <CellSimple height="compact" title="Направление" subtitle="Бизнес-информатика" showChevron />
          <CellSimple height="compact" title="Курс" subtitle="1 курс" showChevron />
        </CellList>

        {/* Тестирование / Смена роли */}
        {user.canChangeRole !== false && (
          <CellList mode="island" header={<CellHeader>Тестирование</CellHeader>}>
            <Flex align="center" justify="space-between" className="profile-section-role-row">
              <Typography.Body variant="medium">{currentRoleLabel || '—'}</Typography.Body>
              <UserSwitcher />
            </Flex>
          </CellList>
        )}

        {user.canChangeRole === false && (
          <Container className="profile-section--muted">
            <Typography.Body variant="small" className="profile-section-note">
              Вы вошли по коду приглашения. Смена роли недоступна.
            </Typography.Body>
          </Container>
        )}

        {/* Помощь и поддержка */}
        <CellList mode="island">
          <CellAction onClick={() => {}} showChevron>
            Помощь и поддержка
          </CellAction>
        </CellList>

        {/* Что нового */}
        <CellList mode="island">
          <CellAction onClick={() => {}} showChevron>
            Что нового
          </CellAction>
        </CellList>
      </Flex>
    </Panel>
  );
};

export default ProfilePage;
