/**
 * Мок-данные для сторис (Главная и Хаб).
 * Позже можно заменить на загрузку с API.
 * Каждая история: id, authorName, avatarUrl (опционально), slides — массив слайдов.
 * Слайд: { type: 'text', text } или { type: 'image', url, caption? }.
 */
export const MOCK_STORIES = [
  {
    id: 'story-1',
    authorName: 'Университет',
    avatarUrl: null,
    slides: [
      { type: 'text', text: 'Добро пожаловать в РАНХиГС!' },
      { type: 'text', text: 'Новости и события — в ленте ниже.' },
    ],
  },
  {
    id: 'story-2',
    authorName: 'Студсовет',
    avatarUrl: null,
    slides: [
      { type: 'text', text: 'Собрание в среду в 18:00. Аудитория 301.' },
    ],
  },
  {
    id: 'story-3',
    authorName: 'Мероприятия',
    avatarUrl: null,
    slides: [
      { type: 'text', text: 'Не пропустите День открытых дверей — 15 февраля.' },
      { type: 'text', text: 'Регистрация в разделе «События».' },
    ],
  },
];
