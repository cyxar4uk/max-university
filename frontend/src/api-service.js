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
      // Получаем ID пользователя из MAX Bridge или localStorage
      let userId = null;
      if (window.WebApp?.initDataUnsafe?.user) {
        userId = window.WebApp.initDataUnsafe.user.id;
      } else {
        // Fallback для мок-режима: берем из localStorage
        const storedUserId = localStorage.getItem('maxUserId');
        if (storedUserId) {
          userId = parseInt(storedUserId);
        }
      }
      
      if (userId) {
        config.headers['X-MAX-User-ID'] = userId;
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
  async getSchedule(date = null, filters = {}) {
    try {
      const params = { date, ...filters };
      const response = await this.client.get('/schedule', { params });
      return response.data;
    } catch (error) {
      console.error('Get schedule error:', error);
      // Возвращаем мок-данные при ошибке для демонстрации
      return {
        schedule: [
          {
            id: 1,
            time: "14:00 - 14:30",
            time_start: "14:00",
            time_end: "14:30",
            subject: "Введение в экономику",
            room: "B0308",
            location: "B0308",
            teacher: "Елена Наумова",
            type: "Семинар",
            indicator: "H",
            indicator_type: "homework"
          },
          {
            id: 2,
            time: "15:50 - 17:10",
            time_start: "15:50",
            time_end: "17:10",
            subject: "Основы Go",
            room: "B0401",
            location: "B0401",
            teacher: "Крутой препод",
            type: "Семинар",
            indicator: "10",
            indicator_type: "minutes"
          },
          {
            id: 3,
            time: "18:00 - 19:30",
            time_start: "18:00",
            time_end: "19:30",
            subject: "Матан, Ю1.2",
            room: "Байкал",
            location: "Байкал",
            teacher: "Крутой препод",
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
      // Возвращаем мок-данные при ошибке
      const mockCourses = {
        1: {
          id: 1,
          name: "Математический анализ",
          authors: "А.С. Глебов К.И. Иванов",
          description: "Курс по математическому анализу охватывает основы дифференциального и интегрального исчисления, теорию пределов, ряды и функции многих переменных. Изучите фундаментальные концепции математики, необходимые для дальнейшего изучения точных наук и инженерии.",
          weeks: [
            { id: 0, title: "Введение", subtitle: null, isActive: false, status: "past" },
            { id: 1, title: "Неделя 1", subtitle: "Пределы и непрерывность функций", isActive: false, status: "past" },
            { id: 2, title: "Неделя 2", subtitle: "Производная и дифференциал", isActive: false, status: "past" },
            { id: 3, title: "Неделя 3", subtitle: "Применение производных", isActive: false, status: "past" },
            { id: 4, title: "Неделя 4", subtitle: "Интегральное исчисление", isActive: false, status: "past" },
            { id: 5, title: "Неделя 5", subtitle: "Определенный интеграл", isActive: true, status: "active" },
            { id: 6, title: "Неделя 6", subtitle: "Ряды и их сходимость", isActive: false, status: "future" },
            { id: 7, title: "Неделя 7", subtitle: "Функции многих переменных", isActive: false, status: "future" },
            { id: 8, title: "Неделя 8", subtitle: "Кратные интегралы", isActive: false, status: "future" }
          ]
        },
        2: {
          id: 2,
          name: "Программирование",
          authors: "И.В. Петров М.А. Сидоров",
          description: "Курс по основам программирования для начинающих. Изучите основные концепции программирования, работу с данными, алгоритмы и структуры данных. Научитесь писать чистый и эффективный код, решать практические задачи и понимать принципы разработки программного обеспечения.",
          weeks: [
            { id: 1, title: "Неделя 1", subtitle: "Введение в программирование", isActive: false, status: "past" },
            { id: 2, title: "Неделя 2", subtitle: "Переменные и типы данных", isActive: false, status: "past" },
            { id: 3, title: "Неделя 3", subtitle: "Условия и циклы", isActive: true, status: "active" },
            { id: 4, title: "Неделя 4", subtitle: "Функции и модули", isActive: false, status: "future" }
          ]
        },
        3: {
          id: 3,
          name: "Базы данных",
          authors: "С.П. Козлов",
          description: "Изучение основ проектирования и работы с базами данных. Изучите SQL, нормализацию, индексы и оптимизацию запросов. Научитесь проектировать эффективные схемы баз данных и работать с реляционными СУБД.",
          weeks: [
            { id: 1, title: "Неделя 1", subtitle: "Введение в базы данных", isActive: false, status: "past" },
            { id: 2, title: "Неделя 2", subtitle: "SQL основы", isActive: true, status: "active" },
            { id: 3, title: "Неделя 3", subtitle: "Нормализация и проектирование", isActive: false, status: "future" }
          ]
        },
        4: {
          id: 4,
          name: "Веб-разработка",
          authors: "А.М. Волков",
          description: "Современная веб-разработка: HTML, CSS, JavaScript, фреймворки и инструменты. Изучите создание интерактивных веб-приложений, работу с API, управление состоянием и современные подходы к разработке фронтенда и бэкенда.",
          weeks: [
            { id: 1, title: "Неделя 1", subtitle: "HTML и CSS", isActive: false, status: "past" },
            { id: 2, title: "Неделя 2", subtitle: "JavaScript основы", isActive: false, status: "past" },
            { id: 3, title: "Неделя 3", subtitle: "React и современные фреймворки", isActive: true, status: "active" }
          ]
        }
      };
      
      return mockCourses[courseId] || mockCourses[1];
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

  // Hub: лента постов (cold_news)
  async getHubFeed(params = {}) {
    try {
      const response = await this.client.get('/hub/feed', { params });
      return response.data;
    } catch (error) {
      console.error('Get hub feed error:', error);
      return { posts: [], total: 0 };
    }
  }

  // Hub: источники для настройки ленты
  async getHubSources() {
    try {
      const response = await this.client.get('/hub/sources');
      return response.data;
    } catch (error) {
      console.error('Get hub sources error:', error);
      return { sources: [] };
    }
  }

  // Внешний API мероприятий (ивенты) для виджетов Главная/Хаб
  async getExternalEvents(limit = 10) {
    try {
      const response = await this.client.get('/external/events', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Get external events error:', error);
      return { events: [], bot_link: 'https://t.me/events_bot' };
    }
  }

  // Получение событий
  async getEvents(universityId = null) {
    try {
      const params = universityId ? { university_id: universityId } : {};
      const response = await this.client.get('/events', { params });
      return response.data;
    } catch (error) {
      console.error('Get events error:', error);
      // Получаем название университета для мок-данных
      let universityName = 'Российская академия народного хозяйства';
      if (universityId) {
        try {
          const uniData = await this.getUniversity(universityId);
          if (uniData.name) {
            universityName = uniData.name;
          }
        } catch (e) {
          console.warn('Could not get university name for mock data');
        }
      }
      
      // Возвращаем мок-данные при ошибке
      return {
        events: [
          {
            id: 2,
            name: "Открытая лекция по AI и машинному обучению",
            title: "Открытая лекция по AI",
            date: "2025-11-20T18:00:00",
            time: "18:00",
            location: `${universityName}, Актовый зал`,
            description: "Встреча с ведущими экспертами в области искусственного интеллекта. Обсуждение последних трендов и практических применений AI.",
            organizer: "Факультет информатики",
            participants: 200,
            images: []
          },
          {
            id: 3,
            name: "Карьерный форум 2025",
            title: "Карьерный форум",
            date: "2025-11-25T09:00:00",
            time: "09:00",
            location: `${universityName}, Конференц-зал`,
            description: "Встреча с работодателями, мастер-классы по составлению резюме и прохождению собеседований. Более 50 компаний-участников.",
            organizer: "Центр карьеры",
            participants: 500,
            images: []
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
      // Мок для демонстрации
      return {
        status: 'registered',
        event_id: eventId,
        message: 'Successfully registered (mock)'
      };
    }
  }

  // Получение списка зарегистрированных событий пользователя
  async getUserEventRegistrations() {
    try {
      const response = await this.client.get('/events/my-registrations');
      return response.data;
    } catch (error) {
      console.error('Get user registrations error:', error);
      // Мок для демонстрации
      return { event_ids: [] };
    }
  }

  // Создание нового мероприятия (для админов)
  async createEvent(eventData) {
    try {
      const response = await this.client.post('/admin/events', eventData);
      return response.data;
    } catch (error) {
      console.error('Create event error:', error);
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
      // Мок-данные при ошибке
      const mockCodes = [];
      for (let i = 0; i < count; i++) {
        mockCodes.push('MOCK' + Math.random().toString(36).substring(2, 10).toUpperCase());
      }
      return {
        success: true,
        codes: mockCodes,
        count: mockCodes.length
      };
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
      // Мок-данные при ошибке
      return {
        codes: []
      };
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
      // Мок-данные при ошибке
      const mockResults = students.map(s => ({
        student_name: s.name,
        student_id: s.id,
        role: s.role || 'student',
        code: 'MOCK' + Math.random().toString(36).substring(2, 10).toUpperCase()
      }));
      return {
        success: true,
        results: mockResults,
        count: mockResults.length
      };
    }
  }

  // API для работы с заявлениями абитуриентов
  async getEducationLevels() {
    try {
      const response = await this.client.get('/admission/levels');
      return response.data;
    } catch (error) {
      console.error('Get education levels error:', error);
      return { levels: [] };
    }
  }

  async getAdmissionDirections(universityId, educationLevel) {
    try {
      const response = await this.client.get('/admission/directions', {
        params: { university_id: universityId, education_level: educationLevel }
      });
      return response.data;
    } catch (error) {
      console.error('Get admission directions error:', error);
      return { directions: [] };
    }
  }

  async getAdmissionDirection(directionId) {
    try {
      const response = await this.client.get(`/admission/directions/${directionId}`);
      return response.data;
    } catch (error) {
      console.error('Get admission direction error:', error);
      throw error;
    }
  }

  async submitApplication(applicationData) {
    try {
      const response = await this.client.post('/admission/apply', applicationData);
      return response.data;
    } catch (error) {
      console.error('Submit application error:', error);
      throw error;
    }
  }

  async getMyApplications(userId) {
    try {
      const response = await this.client.get('/admission/my-applications', {
        params: { user_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error('Get my applications error:', error);
      return { applications: [] };
    }
  }

  async getPendingApplications(universityId) {
    try {
      const response = await this.client.get('/admin/applications', {
        params: { university_id: universityId }
      });
      return response.data;
    } catch (error) {
      console.error('Get pending applications error:', error);
      return { applications: [] };
    }
  }

  async reviewApplication(applicationId, status, reviewNotes) {
    try {
      const response = await this.client.post(`/admin/applications/${applicationId}/review`, {
        status,
        review_notes: reviewNotes
      });
      return response.data;
    } catch (error) {
      console.error('Review application error:', error);
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