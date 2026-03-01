import sodium from "libsodium-wrappers";

async function main() {
  await sodium.ready;

  const baseUrl = process.env.BASE_URL ?? "http://localhost:8080";
  const token = process.env.TOKEN;
  const deviceId = process.env.DEVICE_ID;

  if (!token) throw new Error("Set TOKEN (JWT) env var");
  if (!deviceId) throw new Error("Set DEVICE_ID env var");

  console.log(`Starting PreKey Hygiene Test for Device: ${deviceId}`);

  // 1. Check current stats
  const statsRes1 = await fetch(`${baseUrl}/prekeys/stats?deviceId=${deviceId}`, {
    headers: { Authorization: `Bearer ${token}`, "x-device-id": deviceId },
  });
  const stats1 = await statsRes1.json();
  console.log("Initial Stats:", stats1);

  // 2. Register a batch of new prekeys (e.g., 10)
  // This should trigger the cleanup logic if total unused > 100
  const count = 10;
  const publicKeys = Array.from({ length: count }).map(() => 
    sodium.to_base64(sodium.crypto_box_keypair().publicKey, sodium.base64_variants.URLSAFE_NO_PADDING)
  );

  console.log(`Registering ${count} new prekeys...`);
  const regRes = await fetch(`${baseUrl}/prekeys/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-device-id": deviceId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceId,
      keyType: "x25519",
      publicKeys,
    }),
  });

  if (!regRes.ok) {
    throw new Error(`Registration failed: ${regRes.status} ${await regRes.text()}`);
  }
  console.log("Registration successful.");

  // 3. Final stats check
  const statsRes2 = await fetch(`${baseUrl}/prekeys/stats?deviceId=${deviceId}`, {
    headers: { Authorization: `Bearer ${token}`, "x-device-id": deviceId },
  });
  const stats2 = await statsRes2.json();
  console.log("Final Stats (should have unused: 100):", stats2);
}

main().catch(console.error);
