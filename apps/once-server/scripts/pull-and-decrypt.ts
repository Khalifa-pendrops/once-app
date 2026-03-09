import sodium from "libsodium-wrappers";

type Pulled = {
  messages: Array<{
    messageId: string;
    nonce: string;
    ciphertext: string;
    senderPublicKey: string;
    createdAt: number;
  }>;
};

async function main() {
  await sodium.ready;

  const baseUrl = process.env.BASE_URL ?? "http://localhost:8080";
  const token = process.env.TOKEN;
  const deviceId = process.env.DEVICE_ID;
  const recipientPrivB64 = process.env.RECIPIENT_PRIV;

  if (!token) throw new Error("Set TOKEN env var");
  if (!deviceId) throw new Error("Set DEVICE_ID env var");
  if (!recipientPrivB64) throw new Error("Set RECIPIENT_PRIV env var");

  const res = await fetch(`${baseUrl}/messages/pull`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-device-id": deviceId,
    },
  });

  if (!res.ok) {
    throw new Error(`Pull failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as Pulled;
  console.log("Pulled count:", data.messages.length);

  const recipientPriv = sodium.from_base64(recipientPrivB64);

  for (const m of data.messages) {
    const nonce = sodium.from_base64(m.nonce);
    const ciphertext = sodium.from_base64(m.ciphertext);
    const senderPub = sodium.from_base64(m.senderPublicKey);

    const plaintextBytes = sodium.crypto_box_open_easy(
      ciphertext,
      nonce,
      senderPub,
      recipientPriv
    );

    console.log(`[${m.messageId}] Decrypted:`, sodium.to_string(plaintextBytes));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});