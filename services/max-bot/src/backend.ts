const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
const BOT_SECRET = process.env.BOT_SECRET || process.env.BOT_TOKEN;

export interface SyncUserPayload {
  max_user_id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string | null;
  role?: string | null;
  university_id?: number;
}

export interface UserInfo {
  max_user_id: number;
  first_name?: string;
  last_name?: string;
  role?: string | null;
  [key: string]: unknown;
}

/** Создать/обновить пользователя в бэкенде и получить текущие данные (в т.ч. role). */
export async function syncUser(payload: SyncUserPayload): Promise<UserInfo | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (BOT_SECRET) {
      headers['X-Bot-Secret'] = BOT_SECRET;
    }
    const res = await fetch(`${BACKEND_URL}/api/bot/sync-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as UserInfo;
    return data;
  } catch {
    return null;
  }
}

/** Обновить только роль пользователя. */
export async function setUserRole(maxUserId: number | string, role: string, universityId: number = 1): Promise<boolean> {
  const user = await syncUser({ max_user_id: maxUserId, role, university_id: universityId });
  return user != null;
}
