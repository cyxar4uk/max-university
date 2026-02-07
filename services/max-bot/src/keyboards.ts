import { Keyboard } from '@maxhub/max-bot-api';

const MINI_APP_URL = process.env.MINI_APP_URL?.replace(/\/$/, '') || 'https://cyxar4uk.github.io/max-university';

export function roleSelectionKeyboard() {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('👨‍👩‍👧 Родитель', 'role_parent'),
      Keyboard.button.callback('🎯 Абитуриент', 'role_applicant'),
    ],
    [Keyboard.button.callback('👨‍🎓 Студент', 'role_student')],
    [
      Keyboard.button.callback('👔 Преподаватель', 'role_teacher'),
      Keyboard.button.callback('🏢 Сотрудник', 'role_employee'),
    ],
  ]);
}

export function welcomeOpenAppKeyboard(role: string = '') {
  const url = role ? `${MINI_APP_URL}?role=${role}` : MINI_APP_URL;
  return Keyboard.inlineKeyboard([
    [Keyboard.button.link('Открыть приложение', url)],
  ]);
}

export function mainMenuKeyboard(role: string) {
  const url = (r: string) => `${MINI_APP_URL}?role=${r}`;
  const byRole: Record<string, ReturnType<typeof Keyboard.inlineKeyboard>> = {
    student: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('👤 Профиль', 'block_profile'),
        Keyboard.button.callback('📅 Расписание', 'block_schedule'),
      ],
      [
        Keyboard.button.callback('📚 Материалы', 'block_lms'),
        Keyboard.button.callback('📝 Услуги', 'block_services'),
      ],
      [
        Keyboard.button.callback('🎉 Жизнь', 'block_life'),
        Keyboard.button.callback('💳 Оплата', 'block_payment'),
      ],
      [Keyboard.button.link('🌐 Открыть приложение', url('student'))],
    ]),
    applicant: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('👤 Профиль', 'block_profile'),
        Keyboard.button.callback('📰 Новости', 'block_news'),
      ],
      [
        Keyboard.button.callback('📄 Поступление', 'block_admission'),
        Keyboard.button.callback('💳 Оплата', 'block_payment'),
      ],
      [Keyboard.button.link('🌐 Открыть приложение', url('applicant'))],
    ]),
    parent: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('👤 Профиль', 'block_profile'),
        Keyboard.button.callback('📰 Новости', 'block_news'),
      ],
      [
        Keyboard.button.callback('📄 Поступление', 'block_admission'),
        Keyboard.button.callback('💳 Оплата', 'block_payment'),
      ],
      [Keyboard.button.link('🌐 Открыть приложение', url('parent'))],
    ]),
    teacher: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('👤 Профиль', 'block_profile'),
        Keyboard.button.callback('📅 Расписание', 'block_schedule'),
      ],
      [
        Keyboard.button.callback('📝 Услуги', 'block_services'),
        Keyboard.button.callback('📰 Новости', 'block_news'),
      ],
      [Keyboard.button.link('🌐 Открыть приложение', url('teacher'))],
    ]),
    employee: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('👤 Профиль', 'block_profile'),
        Keyboard.button.callback('📅 График', 'block_schedule'),
      ],
      [
        Keyboard.button.callback('📝 Заявки', 'block_services'),
        Keyboard.button.callback('📰 Новости', 'block_news'),
      ],
      [Keyboard.button.link('🌐 Открыть приложение', url('employee'))],
    ]),
    admin: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('📊 Аналитика', 'block_analytics'),
        Keyboard.button.callback('⚙️ Настройки', 'block_config'),
      ],
      [
        Keyboard.button.callback('👥 Пользователи', 'block_users'),
        Keyboard.button.callback('📰 Новости', 'block_news'),
      ],
      [Keyboard.button.link('🌐 Панель администратора', url('admin'))],
    ]),
  };
  return byRole[role] || byRole.student;
}

const blockNames: Record<string, string> = {
  profile: '👤 Профиль',
  schedule: '📅 Расписание',
  lms: '📚 Учебные материалы',
  services: '📝 Электронные услуги',
  life: '🎉 Внеучебная жизнь',
  news: '📰 Новости',
  payment: '💳 Оплата',
  admission: '📄 Поступление',
  analytics: '📊 Аналитика',
  config: '⚙️ Настройки',
  users: '👥 Пользователи',
};

export function quickActionsKeyboard(block: string) {
  const url = (path: string) => `${MINI_APP_URL}/${path}`;
  const back = [Keyboard.button.callback('« Назад в меню', 'back_to_menu')];
  const byBlock: Record<string, ReturnType<typeof Keyboard.inlineKeyboard>> = {
    schedule: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('📅 Сегодня', 'schedule_today'),
        Keyboard.button.callback('🗓️ Неделя', 'schedule_week'),
      ],
      [
        Keyboard.button.callback('⏰ Следующее занятие', 'schedule_next'),
        Keyboard.button.callback('🔄 Изменения', 'schedule_changes'),
      ],
      [Keyboard.button.link('🌐 Открыть полное расписание', url('schedule'))],
      back,
    ]),
    lms: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('📚 Мои курсы', 'lms_courses'),
        Keyboard.button.callback('📝 Задания', 'lms_assignments'),
      ],
      [
        Keyboard.button.callback('⏰ Дедлайны', 'lms_deadlines'),
        Keyboard.button.callback('📖 Библиотека', 'lms_library'),
      ],
      [Keyboard.button.link('🌐 Открыть LMS', url('courses'))],
      back,
    ]),
    profile: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('🎓 Студенческий билет', 'profile_card'),
        Keyboard.button.callback('📊 Статистика', 'profile_stats'),
      ],
      [Keyboard.button.callback('⚙️ Настройки', 'profile_settings')],
      [Keyboard.button.link('🌐 Открыть профиль', url('profile'))],
      back,
    ]),
    services: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('📄 Заказать справку', 'services_certificate'),
        Keyboard.button.callback('📝 Подать заявление', 'services_application'),
      ],
      [
        Keyboard.button.callback('💳 Оплата', 'services_payment'),
        Keyboard.button.callback('🎫 Пропуск', 'services_pass'),
      ],
      [Keyboard.button.link('🌐 Все услуги', url('services'))],
      back,
    ]),
    life: Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('🎉 События сегодня', 'life_events_today'),
        Keyboard.button.callback('📰 Новости', 'life_news'),
      ],
      [
        Keyboard.button.callback('💼 Вакансии', 'life_jobs'),
        Keyboard.button.callback('🏛️ Клубы', 'life_clubs'),
      ],
      [Keyboard.button.link('🌐 Вся внеучебка', url('events'))],
      back,
    ]),
  };
  return byBlock[block] || mainMenuKeyboard('student');
}

export function getBlockTitle(block: string): string {
  return blockNames[block] || block;
}

export const ROLE_NAMES: Record<string, string> = {
  parent: 'Родитель',
  applicant: 'Абитуриент',
  student: 'Студент',
  teacher: 'Преподаватель',
  employee: 'Сотрудник',
  admin: 'Администратор',
};

export function getRoleName(role: string): string {
  return ROLE_NAMES[role] || role;
}
