import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMAXBridge } from '../useMAXBridge.js';
import apiService from '../api-service.js';
import { getDisplayUser } from '../utils/displayUser.js';
import HubEventsWidget from '../Widgets/HubEventsWidget.jsx';
import FeedSourcesModal, { getStoredSources, setStoredSources } from '../components/FeedSourcesModal.jsx';
import StoriesViewer from '../components/StoriesViewer.jsx';
import { MOCK_STORIES } from '../data/mockStories.js';

const baseUrl = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
const icon = (name) => `${baseUrl}icons/${name}.svg`;

/**
 * Хаб: хедер (аватар | сторис в центре | поиск), Ближайшие события, Лента новостей с выбором источников.
 */
const HubPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { userInfo } = useMAXBridge();
  const { avatarUrl: userAvatar } = getDisplayUser(userInfo, user);
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [sources, setSources] = useState([]);
  const [selectedSources, setSelectedSources] = useState(getStoredSources);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [storiesViewerIndex, setStoriesViewerIndex] = useState(null);
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
      {/* Хедер по макету: аватар | сторис в центре | поиск */}
      <header className="hub-header hub-header--white">
        <div className="hub-header-inner">
          <button
            type="button"
            className="hub-header-avatar-wrap"
            onClick={handleProfileClick}
            aria-label="Профиль"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="" className="hub-header-avatar-img" />
            ) : (
              <span className="hub-header-avatar-initial">?</span>
            )}
          </button>
          <div className="hub-header-stories">
            <div className="hub-header-story hub-header-story--add" aria-hidden="true">+</div>
            {MOCK_STORIES.slice(0, 3).map((story, index) => (
              <button
                key={story.id}
                type="button"
                className="hub-header-story hub-header-story--gradient hub-header-story--btn"
                onClick={() => setStoriesViewerIndex(index)}
                title={story.authorName}
              >
                {story.avatarUrl ? (
                  <img src={story.avatarUrl} alt="" />
                ) : (
                  <span>{(story.authorName || '?').charAt(0)}</span>
                )}
              </button>
            ))}
          </div>
          <button type="button" className="hub-header-search" aria-label="Поиск">
            <img src={icon('iconsearch')} alt="" width={22} height={22} />
          </button>
        </div>
      </header>

      <main className="hub-content">
        {/* Ближайшие события — первым блоком, карточка или пустое состояние */}
        <section className="hub-section hub-events-section">
          <h2 className="hub-section-title">Ближайшие события</h2>
          <HubEventsWidget limit={3} showCardLayout showEmptyState />
        </section>

        {/* Лента новостей с «Настроить» (выбор источников) */}
        <section className="hub-section hub-feed-section">
          <div className="hub-feed-section-header">
            <h2 className="hub-section-title">Лента новостей</h2>
            <button
              type="button"
              className="hub-feed-configure"
              onClick={() => setSourcesModalOpen(true)}
              aria-label="Настроить источники"
            >
              Настроить
            </button>
          </div>
          <div className="hub-feed-list">
            {feedLoading && feedPosts.length === 0 ? (
              <div className="hub-feed-loading">Загрузка...</div>
            ) : feedPosts.length > 0 ? (
              <ul className="hub-feed-posts">
                {feedPosts.map((post) => (
                  <li key={post.id} className="feed-post-card">
                    <div className="feed-post-author">
                      <div className="feed-post-author-avatar">
                        {(post.channelUsername || post.channel || 'К').charAt(0).toUpperCase()}
                      </div>
                      <div className="feed-post-author-info">
                        <span className="feed-post-author-name">{post.channelUsername || post.channel || 'Канал'}</span>
                        {(post.subscribers != null || post.subscriber_count != null) && (
                          <span className="feed-post-author-subscribers">
                            {(post.subscribers ?? post.subscriber_count ?? 0).toLocaleString('ru-RU')} подписчиков
                          </span>
                        )}
                      </div>
                      <span className="feed-post-date">{formatPostDate(post.date)}</span>
                    </div>
                    <div className="feed-post-text">{post.text}</div>
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
              <button
                type="button"
                className="hub-feed-more"
                onClick={loadMore}
                disabled={feedLoading}
              >
                {feedLoading ? 'Загрузка…' : 'Ещё'}
              </button>
            )}
          </div>
        </section>
      </main>

      {storiesViewerIndex !== null && (
        <StoriesViewer
          stories={MOCK_STORIES}
          startStoryIndex={storiesViewerIndex}
          onClose={() => setStoriesViewerIndex(null)}
        />
      )}

      <FeedSourcesModal
        isOpen={sourcesModalOpen}
        onClose={() => setSourcesModalOpen(false)}
        selectedSources={selectedSources}
        onSave={handleSaveSources}
      />
    </div>
  );
};

export default HubPage;
