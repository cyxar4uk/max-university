import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Panel, Flex, Avatar, Typography } from '@maxhub/max-ui';
import { useMAXBridge } from '../useMAXBridge.js';
import { getDisplayUser } from '../utils/displayUser.js';
import { useProfileLocation } from '../utils/useProfileLocation.js';
import apiService from '../api-service.js';
import StoriesViewer from '../components/StoriesViewer.jsx';

const roleNames = {
  student: 'Студент',
  applicant: 'Абитуриент',
  employee: 'Сотрудник',
  teacher: 'Учитель',
  admin: 'Администратор',
};

const UNIVERSITY_NAMES = { 1: 'РАНХиГС', 2: 'МГУ', 3: 'ВШЭ' };
const UNIVERSITY_DIRECTIONS = { 1: 'Бизнес-информатика', 2: '—', 3: '—' };

const ABOUT_STORAGE_KEY = 'profile_about_me';

const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const { displayName, avatarUrl } = getDisplayUser(userInfo, user);
  const { city, loading: cityLoading, error: cityError, requestLocation } = useProfileLocation();

  const [aboutMe, setAboutMe] = useState(() => localStorage.getItem(ABOUT_STORAGE_KEY) || '');
  const [aboutEditOpen, setAboutEditOpen] = useState(false);
  const [aboutEditValue, setAboutEditValue] = useState('');
  const [myStories, setMyStories] = useState([]);
  const [viewerStoryId, setViewerStoryId] = useState(null);
  const [storyDetailForViewer, setStoryDetailForViewer] = useState(null);

  const currentRoleLabel = user.role ? (roleNames[user.role] || user.role) : null;
  const initial = (displayName || 'П').charAt(0).toUpperCase();
  const universityName = UNIVERSITY_NAMES[user.universityId] || 'РАНХиГС';
  const universityDirection = UNIVERSITY_DIRECTIONS[user.universityId] || '—';

  useEffect(() => {
    let cancelled = false;
    apiService.getMyStories().then((data) => {
      if (!cancelled) setMyStories(data.stories || []);
    }).catch(() => { if (!cancelled) setMyStories([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (viewerStoryId == null) {
      setStoryDetailForViewer(null);
      return;
    }
    let cancelled = false;
    apiService.getStory(viewerStoryId).then((story) => {
      if (!cancelled && story) {
        const slides = (story.slides || []).map((s) => {
          if (s.type === 'image' || s.type === 'video') {
            return { type: s.type, url: apiService.getStoryMediaUrl(s.media_url), duration_sec: s.duration_sec };
          }
          return { type: 'text', text: s.text || '' };
        });
        setStoryDetailForViewer({
          id: story.id,
          authorName: story.author_name,
          avatarUrl: story.avatar_url || null,
          slides,
        });
      }
    }).catch(() => { if (!cancelled) setStoryDetailForViewer(null); });
    return () => { cancelled = true; };
  }, [viewerStoryId]);

  const saveAboutMe = () => {
    setAboutMe(aboutEditValue);
    localStorage.setItem(ABOUT_STORAGE_KEY, aboutEditValue);
    setAboutEditOpen(false);
  };

  return (
    <Panel mode="secondary" className="profile-page-panel">
      {/* Отдельный хедер — только кнопка «Назад», не на одном уровне с аватаркой */}
      <header className="profile-header-only">
        <button
          type="button"
          className="profile-header-back"
          onClick={() => navigate(-1)}
          aria-label="Назад"
        >
          ‹
        </button>
      </header>

      {/* Герой: аватар, имя, роль */}
      <div className="profile-hero">
        <Avatar.Container size={96} form="circle" className="profile-hero-avatar">
          {avatarUrl ? (
            <Avatar.Image src={avatarUrl} alt="" fallback={initial} />
          ) : (
            <Avatar.Text gradient="blue">{initial}</Avatar.Text>
          )}
        </Avatar.Container>
        <Typography.Headline variant="large-strong" className="profile-hero-name">{displayName}</Typography.Headline>
        {currentRoleLabel && (
          <Typography.Body variant="small" className="profile-hero-role">{currentRoleLabel}</Typography.Body>
        )}
      </div>

      {/* Три кнопки: История, Изменить, Настройки */}
      <div className="profile-actions-row">
        <button type="button" className="profile-action-btn" onClick={() => navigate('/create-story')}>
          <span className="profile-action-icon">📸</span>
          <span className="profile-action-label">История</span>
        </button>
        <button type="button" className="profile-action-btn" onClick={() => { setAboutEditValue(aboutMe); setAboutEditOpen(true); }}>
          <span className="profile-action-icon">✏️</span>
          <span className="profile-action-label">Изменить</span>
        </button>
        <button type="button" className="profile-action-btn" onClick={() => navigate('/profile/settings')}>
          <span className="profile-action-icon">⚙️</span>
          <span className="profile-action-label">Настройки</span>
        </button>
      </div>

      {/* Общая информация: О себе, Город */}
      <section className="profile-section profile-section-info">
        <Typography.Headline variant="small" className="profile-section-heading">Общая информация</Typography.Headline>
        <div className="profile-about-block">
          <Typography.Label variant="small" className="profile-about-label">О себе</Typography.Label>
          <Typography.Body variant="medium" className="profile-about-text">
            {aboutMe || 'no limits, just possibilities'}
          </Typography.Body>
        </div>
        <div className="profile-city-row">
          <Typography.Label variant="small" className="profile-city-label">Город</Typography.Label>
          <Typography.Body variant="medium" className="profile-city-value">
            {cityLoading ? 'Определение…' : cityError ? (
              <button type="button" className="profile-city-request" onClick={requestLocation}>
                Разрешить доступ к местоположению
              </button>
            ) : city || 'Не указан'}
          </Typography.Body>
          {!city && !cityLoading && !cityError && (
            <button type="button" className="profile-city-request profile-city-request--small" onClick={requestLocation}>
              Указать город
            </button>
          )}
        </div>
      </section>

      {/* Блок Университет — по клику переход в раздел Учеба */}
      <button type="button" className="profile-university-block" onClick={() => navigate('/study')}>
        <span className="profile-university-icon">🎓</span>
        <div className="profile-university-text">
          <Typography.Label variant="small" className="profile-university-label">Университет</Typography.Label>
          <Typography.Body variant="medium-strong">{universityName}</Typography.Body>
          <Typography.Body variant="small" className="profile-university-direction">{universityDirection}</Typography.Body>
        </div>
        <span className="profile-university-chevron">›</span>
      </button>

      {/* Истории */}
      <section className="profile-section profile-section-stories">
        <Typography.Headline variant="small" className="profile-section-heading">Истории</Typography.Headline>
        <div className="profile-stories-grid">
          <button
            type="button"
            className="profile-story-cell profile-story-cell-add"
            onClick={() => navigate('/create-story')}
            aria-label="Добавить историю"
          >
            +
          </button>
          {myStories.map((story) => (
            <button
              key={story.id}
              type="button"
              className="profile-story-cell"
              onClick={() => setViewerStoryId(story.id)}
            >
              {story.cover_url ? (
                <img src={apiService.getStoryMediaUrl(story.cover_url)} alt="" />
              ) : (
                <span className="profile-story-cell-placeholder" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Модалка редактирования «О себе» */}
      {aboutEditOpen && (
        <div className="profile-modal-backdrop" onClick={() => setAboutEditOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <Typography.Headline variant="small">О себе</Typography.Headline>
            <textarea
              className="profile-modal-textarea"
              value={aboutEditValue}
              onChange={(e) => setAboutEditValue(e.target.value)}
              placeholder="Расскажите о себе..."
              rows={4}
            />
            <div className="profile-modal-actions">
              <button type="button" className="profile-modal-btn profile-modal-btn--secondary" onClick={() => setAboutEditOpen(false)}>
                Отмена
              </button>
              <button type="button" className="profile-modal-btn profile-modal-btn--primary" onClick={saveAboutMe}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {viewerStoryId != null && storyDetailForViewer && (
        <StoriesViewer
          stories={[storyDetailForViewer]}
          startStoryIndex={0}
          onClose={() => { setViewerStoryId(null); setStoryDetailForViewer(null); }}
          storyId={viewerStoryId}
          onViewRecorded={apiService.recordStoryView}
        />
      )}
    </Panel>
  );
};

export default ProfilePage;
