async function main() {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:8080";
  const token = process.env.TOKEN;
  const deviceId = process.env.DEVICE_ID;
  const target = Number(process.env.TARGET ?? 1);

  if (!token) throw new Error("Set TOKEN (JWT) env var");
  if (!deviceId) throw new Error("Set DEVICE_ID env var");

  const auth = { 
    Authorization: `Bearer ${token}`,
    "x-device-id": deviceId
  };

  async function getUnused() {
    const r = await fetch(`${baseUrl}/prekeys/stats?deviceId=${deviceId}`, { headers: auth });
    const j = await r.json() as { unused: number };
    return j.unused;
  }

  let unused = await getUnused();
  console.log(`Current unused: ${unused}, Target: ${target}`);

  while (unused > target) {
    process.stdout.write(".");
    await fetch(`${baseUrl}/prekeys/claim`, { 
      method: "POST", 
      headers: { ...auth, "Content-Type": "application/json" }, 
      body: JSON.stringify({ deviceId }) 
    });
    unused = await getUnused();
  }

  console.log(`\nFinal unused: ${unused}`);
}

main().catch(console.error);
