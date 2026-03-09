import * as Crypto from "expo-crypto";

// We'll use a reliable library for x25519 as expo-crypto is primarily for hashing
// For now, focusing on hashing and preparing for full E2EE key pairs.
export class CryptoService {
  static async hash(data: string): Promise<string> {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }

  static generateRandomToken(length: number = 32): string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < length; i++) {
        // Secure random values would ideally be handled via expo-crypto
        // In a real E2EE implementation, we use dedicated libraries like tweetnacl or libsignal
        token += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return token;
  }
}
