import * as Crypto from "expo-crypto";
import nacl from "tweetnacl";
import { Buffer } from "buffer";
import "react-native-get-random-values";

export type KeyPair = {
  publicKey: string;
  privateKey: string;
};

export class CryptoService {
  static async hash(data: string): Promise<string> {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }

  /**
   * Generates a new x25519 key pair for E2EE.
   * Returns base64 encoded strings.
   */
  static generateKeyPair(): KeyPair {
    const pair = nacl.box.keyPair();
    return {
      publicKey: Buffer.from(pair.publicKey).toString("base64"),
      privateKey: Buffer.from(pair.secretKey).toString("base64"),
    };
  }

  static generateRandomToken(length: number = 32): string {
    const randomBytes = nacl.randomBytes(length);
    return Buffer.from(randomBytes).toString("base64").substring(0, length);
  }
}
