/**
 * Единый источник данных пользователя для отображения (имя, аватар).
 * MAX Bridge передаёт в initDataUnsafe.user поля: first_name, last_name, photo_url (snake_case).
 * Redux хранит firstName, lastName, photoUrl (camelCase).
 * Нормализует оба варианта и возвращает displayName и объект user для getAvatarUrl.
 */
import { getAvatarUrl } from './avatarUrl.js';

/**
 * Нормализовать объект пользователя из MAX или Redux в единый вид (snake_case для совместимости с getAvatarUrl).
 * @param {object} user - из useMAXBridge().userInfo (snake_case) или state.user (camelCase)
 * @returns {{ first_name?: string, last_name?: string, photo_url?: string, username?: string } | null}
 */
export function normalizeUser(user) {
  if (!user || typeof user !== 'object') return null;
  return {
    first_name: user.first_name ?? user.firstName ?? '',
    last_name: user.last_name ?? user.lastName ?? '',
    photo_url: user.photo_url ?? user.photoUrl ?? user.avatar_url ?? user.avatarUrl ?? user.photo ?? null,
    username: user.username ?? null,
  };
}

/**
 * Получить отображаемое имя: "Имя Фамилия" или "Имя" или "Пользователь".
 */
export function getDisplayName(user) {
  const n = normalizeUser(user);
  if (!n) return 'Пользователь';
  const name = [n.first_name, n.last_name].filter(Boolean).join(' ').trim();
  return name || 'Пользователь';
}

/**
 * В компонентах: при наличии данных в Redux предпочитаем Redux (бесшовная смена роли без перезагрузки),
 * иначе — userInfo из MAX Bridge или testUser.
 * @param {string} [fallbackColor] - цвет фона для сгенерированного аватара (например цвет хедера).
 */
export function getDisplayUser(userInfo, reduxUser, fallbackColor) {
  const hasRedux = reduxUser && (reduxUser.firstName != null || reduxUser.first_name != null || reduxUser.maxUserId != null);
  const raw = hasRedux ? reduxUser : (userInfo || null);
  const user = normalizeUser(raw);
  if (!user) return { displayName: 'Пользователь', avatarUrl: null, user: null };
  const avatarUrl = getAvatarUrl(user, fallbackColor);
  const displayName = getDisplayName(user);
  return { displayName, avatarUrl, user: raw };
}
