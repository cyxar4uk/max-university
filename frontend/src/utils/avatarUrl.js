/**
 * URL аватара пользователя из MAX Bridge или Redux.
 * MAX может передавать photo_url, avatar_url или photo (документация: dev.max.ru/docs/webapps/bridge).
 */
export function getAvatarUrl(user, fallbackColor = '0088CC') {
  if (!user) return null;
  const url = user.photo_url ?? user.avatar_url ?? user.photo ?? user.photoUrl ?? user.avatarUrl;
  if (url && typeof url === 'string') return url;
  const name = [user.first_name, user.last_name, user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${(fallbackColor || '0088CC').replace('#', '')}&color=fff`;
}
