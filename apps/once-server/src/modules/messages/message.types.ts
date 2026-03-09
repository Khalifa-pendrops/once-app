export type EncryptedPayload = Readonly<{
  deviceId: string;
  nonce: string;
  ciphertext: string;
  senderPublicKey: string;
  preKeyId?: string; 
}>;

export type CreateEncryptedMessageInput = Readonly<{
  senderUserId: string;
  senderDeviceId: string;
  recipientUserId: string;
  clientMessageId?: string; 
  payloads: EncryptedPayload[];
}>;

export type CreateMessageResult = Readonly<{
  messageId: string;
  expiresInSeconds: number;
  createdAt: number;
  expiresAt: number;
}>;

export type StoredEncryptedMessage = {
  senderUserId: string; 
  senderDeviceId: string; 
  recipientUserId: string;
  recipientDeviceId: string;
  nonce: string;
  ciphertext: string;
  senderPublicKey: string;
  preKeyId?: string;
  createdAt: number;
  expiresAt: number; 
  deliveredAt?: number; 
  ackedAt?: number; 
};

export type DevicePayload = {
  deviceId: string;
  nonce: string;
  ciphertext: string;
  senderPublicKey: string;
  preKeyId?: string; 
};