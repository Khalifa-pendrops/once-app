import { apiClient } from './client';

export type EncryptedPayload = {
  deviceId: string;
  nonce: string; // base64
  ciphertext: string; // base64
  senderPublicKey: string; // base64
};

export type SendMessageRequest = {
  recipientUserId: string;
  clientMessageId: string;
  payloads: EncryptedPayload[];
};

export const messageApi = {
  sendMessage: async (data: SendMessageRequest): Promise<void> => {
    await apiClient.post('/messages', data);
  },
};
