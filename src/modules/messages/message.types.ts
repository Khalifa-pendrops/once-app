export type CreateMessageInput = Readonly<{
  recipientUserId: string;

  /**
   * Encrypted message payload (must be opaque to server).
   * Could be base64, JSON string, etc. for now, we'll treat as a string.
   */
  ciphertext: string;

  /**
   * Optional metadata fields for later (nonce, algorithm, etc).
   * Keep V1 minimal; add later.
   */
}>;

export type CreateMessageResult = Readonly<{
  messageId: string;
  expiresInSeconds: number;
}>;
