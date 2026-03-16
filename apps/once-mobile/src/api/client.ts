import axios from 'axios';
import { Platform } from 'react-native';
import { StorageService, KEYS } from '../services/storage/secureStorage';

const BASE_URL = 'https://once-app-qdwh.onrender.com';

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
