import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Panel, Typography, Button, Avatar } from '@maxhub/max-ui';
import { useMAXBridge } from '../useMAXBridge.js';
import apiService from '../api-service.js';
import { getDisplayUser } from '../utils/displayUser.js';
import HubEventsWidget from '../Widgets/HubEventsWidget.jsx';
import FeedSourcesModal, { getStoredSources, setStoredSources } from '../components/FeedSourcesModal.jsx';
import StoriesViewer from '../components/StoriesViewer.jsx';
import AppHeader from '../components/AppHeader.jsx';

const baseUrl = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
const icon = (name) => `${baseUrl}icons/${name}.svg`;

/**
 * Хаб: хедер (аватар | сторис в центре | поиск), Ближайшие события, Лента новостей с выбором источников.
 */
const HubPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const { displayName, avatarUrl: userAvatar } = getDisplayUser(userInfo, user);
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [sources, setSources] = useState([]);
  const [selectedSources, setSelectedSources] = useState(getStoredSources);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [storiesFeed, setStoriesFeed] = useState([]);
  const [storiesViewerIndex, setStoriesViewerIndex] = useState(null);
  const [storyDetailForViewer, setStoryDetailForViewer] = useState(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedOffset, setFeedOffset] = useState(0);
  const feedLimit = 20;

  useEffect(() => {
    setSelectedSources(getStoredSources());
  }, [sourcesModalOpen]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiService.getHubSources();
        setSources(data.sources || []);
      } catch (e) {
        setSources([]);
      }
    };
    load();
  }, []);

  const loadFeed = useCallback(async (append = false) => {
    setFeedLoading(true);
    try {
      const stored = selectedSources.length ? selectedSources : getStoredSources();
      const params = { limit: feedLimit, offset: append ? feedOffset : 0 };
      if (stored.length === 1) params.channel = stored[0];
      else if (stored.length > 1) params.channel = stored[0];
      const data = await apiService.getHubFeed(params);
      const posts = data.posts || [];
      const total = data.total ?? 0;
      if (append) {
        setFeedPosts((prev) => [...prev, ...posts]);
      } else {
        setFeedPosts(posts);
      }
      setFeedOffset((append ? feedOffset : 0) + posts.length);
      setFeedTotal(total);
    } catch (e) {
      if (!append) setFeedPosts([]);
    } finally {
      setFeedLoading(false);
    }
  }, [feedOffset, selectedSources]);

  useEffect(() => {
    loadFeed(false);
  }, [selectedSources]);

  const universityIdForStories = user.universityId || parseInt(localStorage.getItem('universityId') || '1', 10);
  useEffect(() => {
    let cancelled = false;
    apiService.getStoriesFeed({ university_id: universityIdForStories, limit: 20 }).then((data) => {
      if (!cancelled) setStoriesFeed(data.stories || []);
    }).catch(() => { if (!cancelled) setStoriesFeed([]); });
    return () => { cancelled = true; };
  }, [universityIdForStories]);

  useEffect(() => {
    if (storiesViewerIndex == null || !storiesFeed[storiesViewerIndex]) {
      setStoryDetailForViewer(null);
      return;
    }
    const id = storiesFeed[storiesViewerIndex].id;
    let cancelled = false;
    apiService.getStory(id).then((story) => {
      if (!cancelled && story) {
        const slides = (story.slides || []).map((s) => {
          if (s.type === 'image' || s.type === 'video') {
            return { type: s.type, url: apiService.getStoryMediaUrl(s.media_url), duration_sec: s.duration_sec };
          }
          return { type: 'text', text: s.text || '' };
        });
        setStoryDetailForViewer({ id: story.id, authorName: story.author_name, avatarUrl: story.avatar_url || null, slides });
      }
    }).catch(() => { if (!cancelled) setStoryDetailForViewer(null); });
    return () => { cancelled = true; };
  }, [storiesViewerIndex, storiesFeed]);

  const handleSaveSources = (next) => {
    setStoredSources(next);
    setSelectedSources(next);
  };

  const handleProfileClick = () => navigate('/profile');

  const formatPostDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('ru-RU', { weekday: 'short' });
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const loadMore = () => {
    if (!feedLoading && feedOffset < feedTotal) loadFeed(true);
  };

  return (
    <div className="hub-page">
      <Panel mode="secondary" className="hub-page-panel">
      <AppHeader
        variant="hub"
        displayName={displayName}
        avatarUrl={userAvatar}
        onProfileClick={handleProfileClick}
        centerContent={
          <div className="hub-header-stories">
            <button type="button" className="hub-header-story hub-header-story--add" onClick={() => navigate('/create-story')} aria-label="Добавить историю">+</button>
            {storiesFeed.slice(0, 3).map((story, index) => (
              <button
                key={story.id}
                type="button"
                className="hub-header-story hub-header-story--gradient hub-header-story--btn"
                onClick={() => setStoriesViewerIndex(index)}
                title={story.author_name}
              >
                <Avatar.Container size={40} form="circle">
                  {story.avatar_url ? (
                    <Avatar.Image src={story.avatar_url} alt="" fallback={(story.author_name || '?').charAt(0)} />
                  ) : (
                    <Avatar.Text gradient="blue">{(story.author_name || '?').charAt(0)}</Avatar.Text>
                  )}
                </Avatar.Container>
              </button>
            ))}
          </div>
        }
        rightContent={
          <button type="button" className="hub-header-search" aria-label="Поиск">
            <img src={icon('iconsearch')} alt="" width={22} height={22} />
          </button>
        }
      />

      <main className="hub-content">
        {/* Ближайшие события — первым блоком, карточка или пустое состояние */}
        <section className="hub-section hub-events-section">
          <Typography.Headline variant="medium" className="hub-section-title">Ближайшие события</Typography.Headline>
          <HubEventsWidget limit={3} showCardLayout showEmptyState />
        </section>

        {/* Лента новостей с «Настроить» (выбор источников) */}
        <section className="hub-section hub-feed-section">
          <div className="hub-feed-section-header">
            <Typography.Headline variant="medium" className="hub-section-title">Лента новостей</Typography.Headline>
            <Button
              mode="tertiary"
              appearance="themed"
              size="small"
              className="hub-feed-configure"
              onClick={() => setSourcesModalOpen(true)}
              aria-label="Настроить источники"
            >
              Настроить
            </Button>
          </div>
          <div className="hub-feed-list">
            {feedLoading && feedPosts.length === 0 ? (
              <div className="hub-feed-loading">Загрузка...</div>
            ) : feedPosts.length > 0 ? (
              <ul className="hub-feed-posts">
                {feedPosts.map((post) => (
                  <li key={post.id} className="feed-post-card">
                    <div className="feed-post-author">
                      <Avatar.Container size={36} form="circle" className="feed-post-author-avatar">
                        <Avatar.Text gradient="blue">{(post.channelUsername || post.channel || 'К').charAt(0).toUpperCase()}</Avatar.Text>
                      </Avatar.Container>
                      <div className="feed-post-author-info">
                        <Typography.Body variant="small-strong" className="feed-post-author-name">{post.channelUsername || post.channel || 'Канал'}</Typography.Body>
                        {(post.subscribers != null || post.subscriber_count != null) && (
                          <Typography.Body variant="small" className="feed-post-author-subscribers">
                            {(post.subscribers ?? post.subscriber_count ?? 0).toLocaleString('ru-RU')} подписчиков
                          </Typography.Body>
                        )}
                      </div>
                      <Typography.Label variant="small" className="feed-post-date">{formatPostDate(post.date)}</Typography.Label>
                    </div>
                    <Typography.Body variant="medium" className="feed-post-text">{post.text}</Typography.Body>
                    {(post.tema?.length > 0 || post.link) && (
                      <div className="feed-post-footer">
                        {post.tema?.length > 0 && (
                          <div className="feed-post-tags">
                            {post.tema.slice(0, 3).map((t) => (
                              <span key={t} className="feed-post-tag">{t}</span>
                            ))}
                          </div>
                        )}
                        {post.link && (
                          <a href={post.link} target="_blank" rel="noopener noreferrer" className="feed-post-link">
                            Открыть пост
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="hub-feed-empty">
                <p>Лента постов будет здесь.</p>
                <p className="hub-feed-hint">
                  Нажмите «Настроить», чтобы выбрать источники, или запустите сервис cold_news.
                </p>
              </div>
            )}
            {feedOffset < feedTotal && feedPosts.length > 0 && (
              <Button
                mode="secondary"
                appearance="neutral"
                className="hub-feed-more"
                onClick={loadMore}
                disabled={feedLoading}
                loading={feedLoading}
              >
                {feedLoading ? 'Загрузка…' : 'Ещё'}
              </Button>
            )}
          </div>
        </section>
      </main>

      {storiesViewerIndex !== null && storyDetailForViewer && (
        <StoriesViewer
          stories={[storyDetailForViewer]}
          startStoryIndex={0}
          onClose={() => { setStoriesViewerIndex(null); setStoryDetailForViewer(null); }}
          storyId={storiesFeed[storiesViewerIndex]?.id}
          onViewRecorded={apiService.recordStoryView}
        />
      )}

      <FeedSourcesModal
        isOpen={sourcesModalOpen}
        onClose={() => setSourcesModalOpen(false)}
        selectedSources={selectedSources}
        onSave={handleSaveSources}
      />
      </Panel>
    </div>
  );
};

export default HubPage;
