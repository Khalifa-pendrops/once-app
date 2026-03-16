import { useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/authStore';
import { StorageService, KEYS } from '../services/storage/secureStorage';
import { wsClient } from '../services/ws/wsClient';

export function useDecryptionGuard() {
  const { setUnlocked, setDecryptedKey, isUnlocked } = useAuthStore();

  const unlock = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Fallback for devices without biometrics (e.g. emulators)
        // In production, we'd use a PIN fallback, but for now we'll allow it
        console.warn('Biometrics not available. Using bypass for development.');
      } else {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock your Secret Vault',
          fallbackLabel: 'Enter Passcode',
          disableDeviceFallback: false,
        });

        if (!result.success) {
          throw new Error('Authentication failed');
        }
      }

      // 1. Retrieve the private key from SecureStore
      const privateKey = await StorageService.getItem(KEYS.IDENTITY_PRIVATE_KEY);
      
      if (!privateKey) {
        throw new Error('Identity keys missing. Please repeat the ritual.');
      }

      // 2. Load into memory store
      setDecryptedKey(privateKey);
      setUnlocked(true);
      await wsClient.syncPendingMessages();

      // @ts-ignore
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (error) {
      console.error('Unlock failed:', error);
      // @ts-ignore
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
  }, [setUnlocked, setDecryptedKey]);

  return { unlock, isUnlocked };
}
