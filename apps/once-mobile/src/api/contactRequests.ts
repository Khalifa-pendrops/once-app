import { apiClient } from './client';

export type ContactRequestRecord = {
  id: string;
  requesterUserId: string;
  requesterEmail: string;
  recipientUserId: string;
  recipientEmail: string;
  status: 'pending' | 'accepted' | 'ignored';
  createdAt: string;
  respondedAt?: string | null;
};

export const contactRequestApi = {
  create: async (recipientUserId: string): Promise<ContactRequestRecord> => {
    const response = await apiClient.post<ContactRequestRecord>('/contact-requests', { recipientUserId });
    return response.data;
  },

  listIncoming: async (): Promise<{ requests: ContactRequestRecord[] }> => {
    const response = await apiClient.get<{ requests: ContactRequestRecord[] }>('/contact-requests/incoming');
    return response.data;
  },

  listOutgoing: async (): Promise<{ requests: ContactRequestRecord[] }> => {
    const response = await apiClient.get<{ requests: ContactRequestRecord[] }>('/contact-requests/outgoing');
    return response.data;
  },

  accept: async (requestId: string): Promise<ContactRequestRecord> => {
    const response = await apiClient.post<ContactRequestRecord>(`/contact-requests/${requestId}/accept`);
    return response.data;
  },
};
