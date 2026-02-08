import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, Typography } from '@maxhub/max-ui';
import { parseChangelog } from '../utils/parseChangelog.js';

const baseUrl = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
const icon = (name) => `${baseUrl}icons/${name}.svg`;
const CHANGELOG_URL = `${baseUrl}CHANGELOG.md`;

/**
 * Экран «Что нового»: загружает CHANGELOG.md из репозитория (public/CHANGELOG.md)
 * и отображает версии. Файл можно синхронизировать с корневым CHANGELOG.md в git.
 */
const ProfileChangelogPage = () => {
  const navigate = useNavigate();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(CHANGELOG_URL)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('Not found'))))
      .then((text) => {
        if (!cancelled) setReleases(parseChangelog(text));
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setReleases([]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Panel mode="secondary" className="profile-changelog-page">
      <header className="profile-header-only">
        <button type="button" className="profile-header-back" onClick={() => navigate(-1)} aria-label="Назад">
          <img src={icon('icon-back')} alt="" width={24} height={24} />
        </button>
      </header>
      <div className="profile-changelog-content">
        <Typography.Headline variant="medium" className="profile-changelog-title">
          Что нового
        </Typography.Headline>
        {loading && <p className="profile-changelog-loading">Загрузка…</p>}
        {error && (
          <p className="profile-changelog-error">
            Не удалось загрузить список версий. Проверьте подключение к интернету.
          </p>
        )}
        {!loading && !error && releases.length === 0 && (
          <p className="profile-changelog-empty">Пока нет записей о версиях.</p>
        )}
        {!loading && releases.map((release) => (
          <div key={release.version} className="profile-changelog-card">
            <Typography.Body variant="medium-strong" className="profile-changelog-version">
              {release.version} {release.title && `— ${release.title}`}
            </Typography.Body>
            {release.date && (
              <Typography.Label variant="small" className="profile-changelog-date">
                {release.date}
              </Typography.Label>
            )}
            {release.items.length > 0 && (
              <ul className="profile-changelog-list">
                {release.items.map((item, i) => (
                  <li key={i}>
                    <Typography.Body variant="small">{item}</Typography.Body>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
};

export default ProfileChangelogPage;
