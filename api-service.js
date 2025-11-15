import axios from 'axios';

// В Vite используем import.meta.env вместо process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Сервис для работы с API
 * Все запросы включают данные пользователя из MAX Bridge
 */

class UniversityAPIService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Интерцептор для добавления информации MAX Bridge в заголовки
    this.client.interceptors.request.use((config) => {
      // Получаем ID пользователя из MAX Bridge
      if (window.WebApp?.initDataUnsafe?.user) {
        config.headers['X-MAX-User-ID'] = window.WebApp.initDataUnsafe.user.id;
      }
      
      // Добавляем init data для валидации на бэкенде
      if (window.WebApp?.initData) {
        config.headers['X-MAX-Init-Data'] = window.WebApp.initData;
      }

      return config;
    });

    // Интерцептор для обработки ошибок
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Аутентификация пользователя
  async authenticateUser() {
    try {
      const userData = window.WebApp?.initDataUnsafe;
      if (!userData || !userData.user) {
        // Используем мок-данные для демонстрации
        console.warn('No user data from MAX Bridge, using mock authentication');
        return {
          user: {
            id: 12345,
            max_user_id: 12345,
            first_name: 'Демо',
            last_name: 'Пользователь',
            username: 'demo_user',
            photo_url: null,
            language_code: 'ru',
            role: null,
            university_id: 1,
            created_at: new Date().toISOString()
          },
          new_user: true,
          message: "User created successfully (mock)"
        };
      }

      const response = await this.client.post('/users/auth', {
        max_user_id: userData.user.id,
        first_name: userData.user.first_name,
        last_name: userData.user.last_name,
        username: userData.user.username,
        photo_url: userData.user.photo_url,
        language_code: userData.user.language_code,
        init_data: window.WebApp.initData,
      });

      return response.data;
    } catch (error) {
      console.error('Authentication error:', error);
      // Возвращаем мок-данные при ошибке для демонстрации
      return {
        user: {
          id: 12345,
          max_user_id: 12345,
          first_name: 'Демо',
          last_name: 'Пользователь',
          username: 'demo_user',
          photo_url: null,
          language_code: 'ru',
          role: null,
          university_id: 1,
          created_at: new Date().toISOString()
        },
        new_user: true,
        message: "User created successfully (mock fallback)"
      };
    }
  }

  // Установка роли пользователя
  async setUserRole(role, universityId = null) {
    try {
      const response = await this.client.put('/users/role', {
        role,
        university_id: universityId,
      });
      return response.data;
    } catch (error) {
      console.error('Set role error:', error);
      // Возвращаем успешный ответ для демонстрации
      return {
        user: {
          role: role,
          university_id: universityId || 1
        },
        message: "Role updated successfully (mock)"
      };
    }
  }

  // Получение информации о университете
  async getUniversity(universityId) {
    try {
      const response = await this.client.get(`/universities/${universityId}`);
      return response.data;
    } catch (error) {
      console.error('Get university error:', error);
      throw error;
    }
  }

  // Получение конфигурации блоков для роли
  async getBlocksConfig(universityId, role) {
    try {
      const response = await this.client.get(
        `/universities/${universityId}/blocks`,
        { params: { role } }
      );
      return response.data;
    } catch (error) {
      console.error('Get blocks config error:', error);
      // Возвращаем мок-конфигурацию при ошибке
      const defaultBlocks = {
        student: ["profile", "schedule", "lms", "services", "life"],
        applicant: ["profile", "news", "admission", "payment"],
        employee: ["profile", "schedule", "services", "news"],
        admin: ["profile", "analytics", "config", "users", "all_blocks"]
      };
      return {
        blocks: defaultBlocks[role] || defaultBlocks.student,
        university_name: "Российская академия народного хозяйства",
        role: role
      };
    }
  }

  // Получение расписания
  async getSchedule(date = null) {
    try {
      const response = await this.client.get('/schedule', {
        params: { date },
      });
      return response.data;
    } catch (error) {
      console.error('Get schedule error:', error);
      // Возвращаем мок-данные при ошибке для демонстрации
      return {
        schedule: [
          {
            id: 1,
            time: "09:00-10:30",
            subject: "Математический анализ",
            room: "Аудитория 401",
            teacher: "Иванов И.И.",
            type: "Лекция"
          }
        ],
        date: date || new Date().toISOString().split('T')[0]
      };
    }
  }

  // Получение курсов
  async getCourses() {
    try {
      const response = await this.client.get('/courses');
      return response.data;
    } catch (error) {
      console.error('Get courses error:', error);
      // Возвращаем мок-данные при ошибке
      return {
        courses: [
          {
            id: 1,
            name: "Математический анализ",
            progress: 65,
            assignments: 3,
            next_class: "2025-11-13 09:00"
          },
          {
            id: 2,
            name: "Программирование",
            progress: 78,
            assignments: 1,
            next_class: "2025-11-13 10:45"
          }
        ],
        user_id: null
      };
    }
  }

  // Получение деталей курса
  async getCourseDetails(courseId) {
    try {
      const response = await this.client.get(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Get course details error:', error);
      throw error;
    }
  }

  // Получение заданий
  async getAssignments() {
    try {
      const response = await this.client.get('/assignments');
      return response.data;
    } catch (error) {
      console.error('Get assignments error:', error);
      throw error;
    }
  }

  // Получение оценок
  async getGrades() {
    try {
      const response = await this.client.get('/grades');
      return response.data;
    } catch (error) {
      console.error('Get grades error:', error);
      throw error;
    }
  }

  // Получение новостей
  async getNews() {
    try {
      const response = await this.client.get('/news');
      return response.data;
    } catch (error) {
      console.error('Get news error:', error);
      // Возвращаем мок-данные при ошибке
      return {
        news: [
          {
            id: 1,
            title: "Запуск нового кампуса",
            content: "Открыт новый корпус с современными лабораториями",
            date: "2025-11-10",
            category: "announcement"
          }
        ]
      };
    }
  }

  // Получение событий
  async getEvents() {
    try {
      const response = await this.client.get('/events');
      return response.data;
    } catch (error) {
      console.error('Get events error:', error);
      // Возвращаем мок-данные при ошибке
      return {
        events: [
          {
            id: 1,
            title: "Открытая лекция по AI",
            date: "2025-11-15",
            time: "18:00",
            location: "Аудитория 100",
            participants: 25
          }
        ]
      };
    }
  }

  // Регистрация на событие
  async registerForEvent(eventId) {
    try {
      const response = await this.client.post(`/events/${eventId}/register`);
      return response.data;
    } catch (error) {
      console.error('Register for event error:', error);
      throw error;
    }
  }

  // Отправка задания
  async submitAssignment(assignmentId, content) {
    try {
      const response = await this.client.post(
        `/assignments/${assignmentId}/submit`,
        { content }
      );
      return response.data;
    } catch (error) {
      console.error('Submit assignment error:', error);
      throw error;
    }
  }

  // Получение документов
  async getDocuments() {
    try {
      const response = await this.client.get('/documents');
      return response.data;
    } catch (error) {
      console.error('Get documents error:', error);
      throw error;
    }
  }

  // Запрос справки
  async requestDocument(documentType) {
    try {
      const response = await this.client.post('/documents/request', {
        type: documentType,
      });
      return response.data;
    } catch (error) {
      console.error('Request document error:', error);
      throw error;
    }
  }

  // Получение статистики (для админов)
  async getStatistics() {
    try {
      const response = await this.client.get('/statistics');
      return response.data;
    } catch (error) {
      console.error('Get statistics error:', error);
      // Возвращаем мок-данные при ошибке для демонстрации
      return {
        total_users: 1250,
        active_students: 1542,
        faculty_members: 287,
        events_this_month: 12,
        average_gpa: 3.8
      };
    }
  }

  // Обновление конфигурации блоков (для админов)
  async updateBlocksConfig(universityId, config) {
    try {
      const response = await this.client.put(
        `/universities/${universityId}/blocks-config`,
        config
      );
      return response.data;
    } catch (error) {
      console.error('Update blocks config error:', error);
      throw error;
    }
  }
}

export default new UniversityAPIService();