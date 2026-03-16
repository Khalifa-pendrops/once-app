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

import { StorageService, KEYS } from '../services/storage/secureStorage';

export const messageApi = {
  sendMessage: async (data: SendMessageRequest): Promise<void> => {
    // Manually construct the native fetch request to bypass Axios 1.x RN bugs
    const token = await StorageService.getItem(KEYS.AUTH_TOKEN);
    const deviceId = await StorageService.getItem(KEYS.DEVICE_ID);
    
    if (!token || !deviceId) {
      throw new Error("Missing authentication credentials");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch('https://once-app-qdwh.onrender.com/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Message request timed out after 15 seconds');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
        const errorText = await response.text();
        let errData;
        try {
            errData = JSON.parse(errorText);
        } catch(e) {
            errData = { message: errorText };
        }
        
        throw { 
            message: `HTTP error! status: ${response.status}`, 
            response: { data: errData, status: response.status } 
        };
    }
  },
};
