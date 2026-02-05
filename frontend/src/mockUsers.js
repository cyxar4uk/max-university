// Тестовые пользователи для демонстрации функционала
export const mockUsers = {
  student: {
    id: 10001,
    first_name: 'Иван',
    last_name: 'Петров',
    username: 'ivan_student',
    photo_url: null,
    language_code: 'ru',
    role: 'student',
    university_id: 1
  },
  applicant: {
    id: 10002,
    first_name: 'Мария',
    last_name: 'Иванова',
    username: 'maria_applicant',
    photo_url: null,
    language_code: 'ru',
    role: 'applicant',
    university_id: 1
  },
  employee: {
    id: 10003,
    first_name: 'Петр',
    last_name: 'Сидоров',
    username: 'petr_employee',
    photo_url: null,
    language_code: 'ru',
    role: 'employee',
    university_id: 1
  },
  teacher: {
    id: 10005,
    first_name: 'Елена',
    last_name: 'Наумова',
    username: 'elena_teacher',
    photo_url: null,
    language_code: 'ru',
    role: 'teacher',
    university_id: 1
  },
  parent: {
    id: 10006,
    first_name: 'Ольга',
    last_name: 'Иванова',
    username: 'olga_parent',
    photo_url: null,
    language_code: 'ru',
    role: 'parent',
    university_id: 1
  },
  admin: {
    id: 10004,
    first_name: 'Анна',
    last_name: 'Смирнова',
    username: 'anna_admin',
    photo_url: null,
    language_code: 'ru',
    role: 'admin',
    university_id: 1
  }
};

// Получить тестового пользователя по роли
export const getMockUserByRole = (role) => {
  return mockUsers[role] || mockUsers.student;
};

// Получить всех тестовых пользователей
export const getAllMockUsers = () => {
  return Object.values(mockUsers);
};
