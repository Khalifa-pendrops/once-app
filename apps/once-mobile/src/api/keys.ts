import { apiClient } from './client';

export type ContactKeyResponse = {
  keys: Array<{
    deviceId: string;
    keyType: string;
    publicKey: string;
  }>;
};

export const keyApi = {
  getContactKeys: async (userId: string): Promise<ContactKeyResponse> => {
    const response = await apiClient.get<ContactKeyResponse>(`/keys/${userId}`);
    return response.data;
  },
};
