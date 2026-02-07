import { Keyboard } from '@maxhub/max-bot-api';

const MINI_APP_URL = process.env.MINI_APP_URL?.replace(/\/$/, '') || '';

/** Клавиатура выбора роли: 4 кнопки — Абитуриент, Студент, Сотрудник, Администрация */
export function roleSelectionKeyboard() {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('Абитуриент', 'role_applicant'),
      Keyboard.button.callback('Студент', 'role_student'),
    ],
    [
      Keyboard.button.callback('Сотрудник', 'role_employee'),
      Keyboard.button.callback('Администрация', 'role_admin'),
    ],
  ]);
}

/** Кнопка «Открыть приложение» (мини-приложение в MAX) с учётом выбранной роли */
export function welcomeOpenAppKeyboard(role: string = '') {
  const url = role ? `${MINI_APP_URL}?role=${encodeURIComponent(role)}` : MINI_APP_URL;
  return Keyboard.inlineKeyboard([
    [Keyboard.button.link('Открыть приложение', url)],
  ]);
}

export const ROLE_NAMES: Record<string, string> = {
  applicant: 'Абитуриент',
  student: 'Студент',
  employee: 'Сотрудник',
  admin: 'Администрация',
};

export function getRoleName(role: string): string {
  return ROLE_NAMES[role] || role;
}
