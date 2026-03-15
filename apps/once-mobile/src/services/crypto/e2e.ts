import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

export class E2EService {
  /**
   * Encrypts a plaintext message for a specific recipient.
   * @param message Text to encrypt
   * @param senderPrivateKey Base64 private key of sender
   * @param recipientPublicKey Base64 public key of recipient
   * @returns Object containing base64 encoded nonce and ciphertext
   */
  static encryptMessage(
    message: string,
    senderPrivateKey: string,
    recipientPublicKey: string
  ): { nonce: string; ciphertext: string } {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageUint8 = Buffer.from(message, 'utf8');
    
    // Convert base64 keys to Uint8Arrays
    const secretKeyUint8 = Buffer.from(senderPrivateKey, 'base64');
    const publicKeyUint8 = Buffer.from(recipientPublicKey, 'base64');

    const encryptedMessage = nacl.box(
      messageUint8,
      nonce,
      publicKeyUint8,
      secretKeyUint8
    );

    return {
      nonce: Buffer.from(nonce).toString('base64'),
      ciphertext: Buffer.from(encryptedMessage).toString('base64'),
    };
  }

  /**
   * Decrypts an incoming message.
   * @param ciphertext Base64 encrypted payload
   * @param nonce Base64 nonce used during encryption
   * @param senderPublicKey Base64 public key of the sender
   * @param recipientPrivateKey Base64 private key of the current user
   * @returns The decrypted plaintext string
   */
  static decryptMessage(
    ciphertext: string,
    nonce: string,
    senderPublicKey: string,
    recipientPrivateKey: string
  ): string {
    const ciphertextUint8 = Buffer.from(ciphertext, 'base64');
    const nonceUint8 = Buffer.from(nonce, 'base64');
    const publicKeyUint8 = Buffer.from(senderPublicKey, 'base64');
    const secretKeyUint8 = Buffer.from(recipientPrivateKey, 'base64');

    const decryptedMessage = nacl.box.open(
      ciphertextUint8,
      nonceUint8,
      publicKeyUint8,
      secretKeyUint8
    );

    if (!decryptedMessage) {
      throw new Error('Decryption failed. Keys or nonce may be invalid.');
    }

    return Buffer.from(decryptedMessage).toString('utf8');
  }
}
