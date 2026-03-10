import axios from 'axios';
import { Platform } from 'react-native';
import { StorageService, KEYS } from '../services/storage/secureStorage';

const BASE_URL = 'https://once-app-qdwh.onrender.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Auth interceptor to add JWT to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await StorageService.getItem(KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
