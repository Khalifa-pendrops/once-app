import sodium from "libsodium-wrappers";

type KeysResponse = {
  keys: Array<{ deviceId: string; keyType: string; publicKey: string }>;
};

async function main() {
  await sodium.ready;

  const baseUrl = process.env.BASE_URL ?? "http://localhost:8080";
  const token = process.env.TOKEN;
  const senderDeviceId = process.env.SENDER_DEVICE_ID;
  const recipientUserId = process.env.RECIPIENT_USER_ID;
  const recipientDeviceId = process.env.RECIPIENT_DEVICE_ID;
  const recipientPrivB64 = process.env.RECIPIENT_PRIV;

  if (!token) throw new Error("Set TOKEN (JWT) env var");
  if (!senderDeviceId) throw new Error("Set SENDER_DEVICE_ID env var");
  if (!recipientUserId) throw new Error("Set RECIPIENT_USER_ID env var");
  if (!recipientDeviceId) throw new Error("Set RECIPIENT_DEVICE_ID env var");
  if (!recipientPrivB64) throw new Error("Set RECIPIENT_PRIV env var");

  // 1) Fetch recipient x25519 public key(s)
  const keysRes = await fetch(`${baseUrl}/keys/${recipientUserId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!keysRes.ok) {
    throw new Error(`GET /keys failed: ${keysRes.status} ${await keysRes.text()}`);
  }

  const keysJson = (await keysRes.json()) as KeysResponse;

  const recipientKey = keysJson.keys.find(
    (k) => k.deviceId === recipientDeviceId && k.keyType === "x25519"
  );

  if (!recipientKey) {
    throw new Error("Recipient x25519 key not found for that deviceId");
  }

  const recipientPub = sodium.from_base64(recipientKey.publicKey);

  // 2) Generate sender (Alice) encryption keypair (x25519)
  const sender = sodium.crypto_box_keypair();
  const senderPublicKeyB64 = sodium.to_base64(sender.publicKey);

  // 3) Encrypt plaintext for recipient
  const plaintext = "ONCE E2EE ✅ real proof";
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const ciphertext = sodium.crypto_box_easy(
    plaintext,
    nonce,
    recipientPub,
    sender.privateKey
  );

  const nonceB64 = sodium.to_base64(nonce);
  const ciphertextB64 = sodium.to_base64(ciphertext);

  // 4) POST /messages with payloads[]
  const postRes = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-device-id": senderDeviceId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipientUserId,
      payloads: [
        {
          deviceId: recipientDeviceId,
          nonce: nonceB64,
          ciphertext: ciphertextB64,
          senderPublicKey: senderPublicKeyB64,
        },
      ],
    }),
  });

  if (!postRes.ok) {
    throw new Error(`POST /messages failed: ${postRes.status} ${await postRes.text()}`);
  }

  const postJson = await postRes.json();
  console.log("POST /messages ok:", postJson);

  // 5) Decrypt locally (simulating recipient device)
  const recipientPriv = sodium.from_base64(recipientPrivB64);
  const senderPub = sodium.from_base64(senderPublicKeyB64);

  const decryptedBytes = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    senderPub,
    recipientPriv
  );

  console.log("Decrypted locally:", sodium.to_string(decryptedBytes));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});