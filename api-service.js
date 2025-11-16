import axios from 'axios';
import errorLogger from './utils/errorLogger.js';

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
    this.mockMode = false;
    this.mockModeListeners = [];

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
      (response) => {
        // Если получили успешный ответ, выходим из мок-режима
        if (this.mockMode) {
          this.setMockMode(false);
        }
        return response;
      },
      (error) => {
        // Логируем ошибку
        errorLogger.logError(error, {
          url: error.config?.url,
          method: error.config?.method
        });

        // Если это ошибка сети или таймаут, включаем мок-режим
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
          if (!this.mockMode) {
            this.setMockMode(true, error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  setMockMode(enabled, error = null) {
    this.mockMode = enabled;
    this.mockModeListeners.forEach(listener => listener(enabled, error));
  }

  onMockModeChange(listener) {
    this.mockModeListeners.push(listener);
    return () => {
      this.mockModeListeners = this.mockModeListeners.filter(l => l !== listener);
    };
  }

  isMockMode() {
    return this.mockMode;
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
      // Возвращаем мок-конфигурацию при ошибке с sections
      const defaultBlocks = {
        student: ["schedule", "lms", "services", "life", "news"],
        applicant: ["news", "admission", "payment"],
        employee: ["schedule", "services", "news"],
        admin: ["analytics", "config", "users"]
      };
      const blocks = defaultBlocks[role] || defaultBlocks.student;
      const getBlockName = (bt) => {
        const names = {
          schedule: 'Расписание',
          lms: 'Учебные материалы',
          services: 'Услуги',
          life: 'Внеучебная жизнь',
          news: 'Новости',
          admission: 'Поступление',
          payment: 'Оплата',
          analytics: 'Аналитика',
          config: 'Настройки',
          users: 'Пользователи',
        };
        return names[bt] || bt;
      };
      return {
        sections: [{
          id: 1,
          name: "Главное",
          blocks: blocks.map((bt, idx) => ({
            id: idx + 1,
            block_type: bt,
            name: getBlockName(bt),
            order_index: idx
          })),
          header_color: "#0088CC"
        }],
        university_name: "Российская академия народного хозяйства",
        header_color: "#0088CC",
        role: role
      };
    }
  }

  getBlockName(blockType) {
    const names = {
      schedule: 'Расписание',
      lms: 'Учебные материалы',
      services: 'Услуги',
      life: 'Внеучебная жизнь',
      news: 'Новости',
      admission: 'Поступление',
      payment: 'Оплата',
      analytics: 'Аналитика',
      config: 'Настройки',
      users: 'Пользователи',
    };
    return names[blockType] || blockType;
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

  // Админ-панель API
  async getAdminConfig(universityId, role) {
    try {
      const response = await this.client.get(`/admin/config/${universityId}/${role}`);
      return response.data;
    } catch (error) {
      console.error('Get admin config error:', error);
      throw error;
    }
  }

  async updateSectionName(sectionId, name) {
    try {
      const response = await this.client.put(`/admin/sections/${sectionId}/name`, { name });
      return response.data;
    } catch (error) {
      console.error('Update section name error:', error);
      throw error;
    }
  }

  async updateHeaderColor(universityId, role, color) {
    try {
      const response = await this.client.put(
        `/admin/config/${universityId}/${role}/header-color`,
        { color }
      );
      return response.data;
    } catch (error) {
      console.error('Update header color error:', error);
      throw error;
    }
  }

  async reorderBlocks(blockIds) {
    try {
      const response = await this.client.post('/admin/blocks/reorder', { block_ids: blockIds });
      return response.data;
    } catch (error) {
      console.error('Reorder blocks error:', error);
      throw error;
    }
  }

  async addBlock(sectionId, blockType, name, orderIndex = null) {
    try {
      const response = await this.client.post(
        `/admin/sections/${sectionId}/blocks`,
        { block_type: blockType, name, order_index: orderIndex }
      );
      return response.data;
    } catch (error) {
      console.error('Add block error:', error);
      throw error;
    }
  }

  async deleteBlock(blockId) {
    try {
      const response = await this.client.delete(`/admin/blocks/${blockId}`);
      return response.data;
    } catch (error) {
      console.error('Delete block error:', error);
      throw error;
    }
  }

  async addSection(universityId, role, name, headerColor = '#0088CC') {
    try {
      const response = await this.client.post('/admin/sections', {
        university_id: universityId,
        role,
        name,
        header_color: headerColor
      });
      return response.data;
    } catch (error) {
      console.error('Add section error:', error);
      throw error;
    }
  }

  async deleteSection(sectionId) {
    try {
      const response = await this.client.delete(`/admin/sections/${sectionId}`);
      return response.data;
    } catch (error) {
      console.error('Delete section error:', error);
      throw error;
    }
  }

  async getTemplates(role = null) {
    try {
      const response = await this.client.get('/admin/templates', {
        params: role ? { role } : {}
      });
      return response.data;
    } catch (error) {
      console.error('Get templates error:', error);
      throw error;
    }
  }

  async saveTemplate(name, description, role, config) {
    try {
      const response = await this.client.post('/admin/templates', {
        name,
        description,
        role,
        config
      });
      return response.data;
    } catch (error) {
      console.error('Save template error:', error);
      throw error;
    }
  }

  async reorderSections(sectionIds) {
    try {
      const response = await this.client.post('/admin/sections/reorder', { block_ids: sectionIds });
      return response.data;
    } catch (error) {
      console.error('Reorder sections error:', error);
      throw error;
    }
  }

  // Кастомные блоки
  async submitCustomBlock(data) {
    try {
      const response = await this.client.post('/admin/custom-blocks/submit', data);
      return response.data;
    } catch (error) {
      console.error('Submit custom block error:', error);
      throw error;
    }
  }

  async getPendingCustomBlocks() {
    try {
      const response = await this.client.get('/admin/custom-blocks/pending');
      return response.data;
    } catch (error) {
      console.error('Get pending blocks error:', error);
      throw error;
    }
  }

  async reviewCustomBlock(blockId, status, reviewNotes = '') {
    try {
      const response = await this.client.post(
        `/admin/custom-blocks/${blockId}/review`,
        { status, review_notes: reviewNotes }
      );
      return response.data;
    } catch (error) {
      console.error('Review custom block error:', error);
      throw error;
    }
  }

  async getApprovedCustomBlocks(universityId = null) {
    try {
      const response = await this.client.get('/admin/custom-blocks/approved', {
        params: universityId ? { university_id: universityId } : {}
      });
      return response.data;
    } catch (error) {
      console.error('Get approved blocks error:', error);
      throw error;
    }
  }

  async getDevelopmentStandards() {
    try {
      const response = await this.client.get('/admin/custom-blocks/standards');
      return response.data;
    } catch (error) {
      console.error('Get development standards error:', error);
      // Возвращаем мок-данные при ошибке
      return {
        standards: {
          widget_structure: {
            description: "Виджет должен быть React компонентом",
            example: "import React from 'react';\n\nconst CustomWidget = ({ config }) => {\n  return <div className=\"widget\">...</div>;\n};\n\nexport default CustomWidget;"
          },
          props: {
            config: "Объект конфигурации",
            apiService: "Сервис для работы с API"
          },
          security: {
            restrictions: [
              "Не используйте eval()",
              "Не обращайтесь к window напрямую",
              "Не используйте внешние скрипты"
            ]
          }
        }
      };
    }
  }

  // Коды приглашения
  async useInvitationCode(code) {
    try {
      const response = await this.client.post('/invitation/use', { code });
      return response.data;
    } catch (error) {
      console.error('Use invitation code error:', error);
      // Мок для тестирования
      if (code === 'TEST-CODE-123') {
        return {
          university_id: 1,
          role: 'student',
          message: "Invitation code used successfully (mock)"
        };
      }
      throw error;
    }
  }

  async generateInvitationCodes(universityId, role, count = 1) {
    try {
      const response = await this.client.post('/admin/invitation-codes/generate', {
        university_id: universityId,
        role,
        count
      });
      return response.data;
    } catch (error) {
      console.error('Generate invitation codes error:', error);
      throw error;
    }
  }

  async getInvitationCodes(universityId, used = null) {
    try {
      const response = await this.client.get('/admin/invitation-codes', {
        params: {
          university_id: universityId,
          ...(used !== null && { used })
        }
      });
      return response.data;
    } catch (error) {
      console.error('Get invitation codes error:', error);
      throw error;
    }
  }

  async importStudents(universityId, students) {
    try {
      const response = await this.client.post('/admin/invitation-codes/import-students', {
        university_id: universityId,
        students
      });
      return response.data;
    } catch (error) {
      console.error('Import students error:', error);
      throw error;
    }
  }

  // Суперадмин API
  async getAllUniversities() {
    try {
      const response = await this.client.get('/superadmin/universities');
      return response.data;
    } catch (error) {
      console.error('Get all universities error:', error);
      throw error;
    }
  }

  async createUniversity(name, shortName, description, adminUserId) {
    try {
      const response = await this.client.post('/superadmin/universities', {
        name,
        short_name: shortName,
        description,
        admin_user_id: adminUserId
      });
      return response.data;
    } catch (error) {
      console.error('Create university error:', error);
      throw error;
    }
  }

  async setUniversityAdmin(universityId, adminUserId) {
    try {
      const response = await this.client.post(`/superadmin/universities/${universityId}/admin?admin_user_id=${adminUserId}`);
      return response.data;
    } catch (error) {
      console.error('Set university admin error:', error);
      throw error;
    }
  }
}

export default new UniversityAPIService();