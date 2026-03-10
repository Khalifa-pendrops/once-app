import { apiClient } from './client';

export type RegisterInput = {
  email: string;
  password: string;
  deviceName: string;
  keyType: string;
  publicKey: string;
};

export type RegisterResult = {
  userId: string;
  deviceId: string;
  publicKeyId: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  token: string;
  userId: string;
};

export const authApi = {
  register: async (data: RegisterInput): Promise<RegisterResult> => {
    const response = await apiClient.post<RegisterResult>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginInput): Promise<LoginResult> => {
    const response = await apiClient.post<LoginResult>('/auth/login', data);
    return response.data;
  },

  me: async (): Promise<{ userId: string }> => {
    const response = await apiClient.get<{ userId: string }>('/auth/me');
    return response.data;
  }
};
