import axios from 'axios';
import { Platform } from 'react-native';
import { StorageService, KEYS } from '../services/storage/secureStorage';

export const BASE_URL = __DEV__ 
  ? 'http://localhost:8080' 
  : 'https://once-app-qdwh.onrender.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Auth interceptor to add JWT to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await StorageService.getItem(KEYS.AUTH_TOKEN);
    const deviceId = await StorageService.getItem(KEYS.DEVICE_ID);

    // Bypass Axios 1.x React Native header normalization bugs
    const rawHeaders = config.headers as any;
    
    if (token) {
      rawHeaders['Authorization'] = `Bearer ${token}`;
    }
    if (deviceId) {
      rawHeaders['x-device-id'] = deviceId;
    }
    
    // Explicitly reassign
    config.headers = rawHeaders;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      const { reportClientError } = await import('../services/debug/errorReporter');
      const status = error?.response?.status;
      const payload = error?.response?.data;
      const severity = status && status < 500 ? 'warn' : 'error';

      await reportClientError({
        source: 'api',
        severity,
        code: status ? `HTTP_${status}` : 'API_REQUEST_FAILED',
        message: error?.message || 'API request failed',
        route: error?.config?.url,
        context: {
          method: error?.config?.method,
          status,
          response: payload,
        },
      });
    } catch {
      // Intentionally swallow reporting failures.
    }

    return Promise.reject(error);
  }
);
