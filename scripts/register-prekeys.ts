async function main() {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:8080";
  const token = process.env.TOKEN;
  const deviceId = process.env.DEVICE_ID;
  const count = Number(process.env.COUNT ?? 1);

  if (!token) throw new Error("Set TOKEN (JWT) env var");
  if (!deviceId) throw new Error("Set DEVICE_ID env var");

  const keys = Array.from({ length: count }).map((_, i) => `key-${Date.now()}-${i}`);

  const res = await fetch(`${baseUrl}/prekeys/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-device-id": deviceId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deviceId, keyType: "sodium", publicKeys: keys }),
  });

  console.log(await res.json());
}

main().catch(console.error);
