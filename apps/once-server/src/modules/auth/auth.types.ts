export type RegisterInput = Readonly<{
  email: string;
  password: string;

  // device + key info from client
  deviceName: string;
  keyType: string;     // e.g. "ed25519"
  publicKey: string;   // base64 or PEM (will be treated as opaque string for now)
}>;

export type RegisterResult = Readonly<{
  userId: string;
  deviceId: string;
  publicKeyId: string;
}>;
