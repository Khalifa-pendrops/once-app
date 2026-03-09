import * as SecureStore from "expo-secure-store";

const KEYS = {
  IDENTITY_PRIVATE_KEY: "once_id_private_key",
  IDENTITY_PUBLIC_KEY: "once_id_public_key",
  AUTH_TOKEN: "once_auth_token",
  USER_ID: "once_user_id",
  DEVICE_ID: "once_device_id",
};

export class StorageService {
  static async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });
  }

  static async getItem(key: string): Promise<string | null> {
    return await SecureStore.getItemAsync(key);
  }

  static async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }

  static async saveIdentityKeys(privateKey: string, publicKey: string) {
    await this.setItem(KEYS.IDENTITY_PRIVATE_KEY, privateKey);
    await this.setItem(KEYS.IDENTITY_PUBLIC_KEY, publicKey);
  }

  static async clearAll() {
    for (const key of Object.values(KEYS)) {
      await this.removeItem(key);
    }
  }
}

export { KEYS };
