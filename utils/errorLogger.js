/**
 * Утилита для логирования ошибок API
 */

class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 50; // Максимум ошибок в логе
  }

  logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error?.message || 'Unknown error',
      stack: error?.stack || '',
      code: error?.code || '',
      response: error?.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      request: error?.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL
      } : null,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errors.push(errorEntry);
    
    // Ограничиваем размер лога
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Сохраняем в localStorage для отладки
    try {
      localStorage.setItem('api_errors', JSON.stringify(this.errors.slice(-10))); // Последние 10
    } catch (e) {
      console.warn('Cannot save errors to localStorage:', e);
    }
  }

  getErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
    try {
      localStorage.removeItem('api_errors');
    } catch (e) {
      console.warn('Cannot clear errors from localStorage:', e);
    }
  }

  downloadLogs() {
    const logData = {
      timestamp: new Date().toISOString(),
      errors: this.errors,
      summary: {
        totalErrors: this.errors.length,
        uniqueErrors: new Set(this.errors.map(e => e.message)).size
      }
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-errors-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default new ErrorLogger();

