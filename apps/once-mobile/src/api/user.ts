import { apiClient } from './client';

export type UserSearchMatch = {
  id: string;
  email: string;
};

export const userApi = {
  search: async (email: string): Promise<UserSearchMatch> => {
    const response = await apiClient.get<UserSearchMatch>(`/users/search?email=${encodeURIComponent(email)}`);
    return response.data;
  },
};
