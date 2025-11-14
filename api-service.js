import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

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
      if (!userData) {
        throw new Error('No user data from MAX Bridge');
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
      throw error;
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
      throw error;
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
      throw error;
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
      throw error;
    }
  }

  // Получение курсов
  async getCourses() {
    try {
      const response = await this.client.get('/courses');
      return response.data;
    } catch (error) {
      console.error('Get courses error:', error);
      throw error;
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
      throw error;
    }
  }

  // Получение событий
  async getEvents() {
    try {
      const response = await this.client.get('/events');
      return response.data;
    } catch (error) {
      console.error('Get events error:', error);
      throw error;
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
      throw error;
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