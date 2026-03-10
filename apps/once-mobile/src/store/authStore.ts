import { create } from 'zustand';
import { StorageService, KEYS } from '../services/storage/secureStorage';

interface AuthState {
  token: string | null;
  userId: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  hasIdentityKeys: boolean;
  decryptedKey: string | null;
  isUnlocked: boolean;
  setAuth: (token: string, userId: string, deviceId?: string | null) => Promise<void>;
  setHasIdentityKeys: (has: boolean) => void;
  setDecryptedKey: (key: string | null) => void;
  setUnlocked: (unlocked: boolean) => void;
  setDeviceId: (id: string | null) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  deviceId: null,
  isAuthenticated: false,
  hasIdentityKeys: false,
  decryptedKey: null,
  isUnlocked: false,

  setAuth: async (token: string, userId: string, deviceId?: string | null) => {
    await StorageService.setItem(KEYS.AUTH_TOKEN, token);
    await StorageService.setItem(KEYS.USER_ID, userId);
    if (deviceId) {
      await StorageService.setItem(KEYS.DEVICE_ID, deviceId);
    }
    set({ token, userId, deviceId: deviceId ?? null, isAuthenticated: true });
  },

  setHasIdentityKeys: (has: boolean) => set({ hasIdentityKeys: has }),

  setDecryptedKey: (key: string | null) => set({ decryptedKey: key }),

  setUnlocked: (unlocked: boolean) => set({ isUnlocked: unlocked }),

  setDeviceId: async (id: string | null) => {
    if (id) {
      await StorageService.setItem(KEYS.DEVICE_ID, id);
    } else {
      await StorageService.removeItem(KEYS.DEVICE_ID);
    }
    set({ deviceId: id });
  },

  logout: async () => {
    await StorageService.removeItem(KEYS.AUTH_TOKEN);
    await StorageService.removeItem(KEYS.DEVICE_ID);
    set({ token: null, userId: null, deviceId: null, isAuthenticated: false });
  },

  initialize: async () => {
    const token = await StorageService.getItem(KEYS.AUTH_TOKEN);
    const userId = await StorageService.getItem(KEYS.USER_ID);
    const deviceId = await StorageService.getItem(KEYS.DEVICE_ID);
    const idKey = await StorageService.getItem(KEYS.IDENTITY_PRIVATE_KEY);
    
    set({ 
      token, 
      userId, 
      deviceId,
      isAuthenticated: !!(token && userId),
      hasIdentityKeys: !!idKey 
    });
  },
}));
