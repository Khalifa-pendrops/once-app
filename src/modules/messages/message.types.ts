export type EncryptedPayload = Readonly<{
  deviceId: string;
  nonce: string;
  ciphertext: string;
  senderPublicKey: string;
  preKeyId?: string; // ✅ new
}>;

export type CreateEncryptedMessageInput = Readonly<{
  senderUserId: string;
  senderDeviceId: string;
  recipientUserId: string;
  payloads: EncryptedPayload[];
}>;

export type CreateMessageResult = Readonly<{
  messageId: string;
  expiresInSeconds: number;
}>;

export type StoredEncryptedMessage = Readonly<{
  recipientUserId: string;
  recipientDeviceId: string;
  nonce: string;
  ciphertext: string;
  senderPublicKey: string;
  preKeyId?: string; // ✅ NEW
  createdAt: number;
}>;

export type DevicePayload = {
  deviceId: string;
  nonce: string;
  ciphertext: string;
  senderPublicKey: string;
  preKeyId?: string; // ✅ NEW (optional)
};