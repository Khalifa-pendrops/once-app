import sodium from "libsodium-wrappers";

async function main() {
  await sodium.ready;

  const baseUrl = process.env.BASE_URL ?? "http://localhost:8080";
  const token = process.env.TOKEN;
  const deviceId = process.env.DEVICE_ID;
  const concurrency = Number(process.env.CONCURRENCY ?? 10);

  if (!token) throw new Error("Set TOKEN (JWT) env var");
  if (!deviceId) throw new Error("Set DEVICE_ID env var");

  console.log(`\n=== Rigorous Concurrency Test [Limit: ${concurrency}] ===`);
  console.log(`Device: ${deviceId}`);

  // Helper to get stats
  async function getStats() {
    const res = await fetch(`${baseUrl}/prekeys/stats?deviceId=${deviceId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "x-device-id": deviceId!
      },
    });
    const data = await res.json();
    if (data.error) console.error("Stats Error:", data);
    return data;
  }

  // 1. Initial State Check
  const initialStats = await getStats();
  console.log(`Initial Unused: ${initialStats.unused}`);

  // 2. Fire Concurrent Requests
  console.log(`Firing ${concurrency} concurrent claim requests...`);
  const requests = Array.from({ length: concurrency }).map(async (_, i) => {
    try {
      const res = await fetch(`${baseUrl}/prekeys/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deviceId }),
      });

      const status = res.status;
      const data = await res.json().catch(() => ({}));
      return { status, data };
    } catch (err) {
      return { status: "FETCH_ERROR", error: (err as Error).message };
    }
  });

  const results = await Promise.all(requests);

  // 3. Categorize Results
  const successful = results.filter((r) => r.status === 200);
  const depleted = results.filter((r) => r.status === 404);
  const unstable = results.filter((r) => r.status === 500 || r.status === "FETCH_ERROR");
  const others = results.filter((r) => r.status !== 200 && r.status !== 404 && r.status !== 500 && r.status !== "FETCH_ERROR");

  const preKeyIds = successful.map((r) => (r.data as any).bundle?.oneTimePreKey?.id);
  const uniquePreKeyIds = new Set(preKeyIds);

  // 4. Final State Check
  const finalStats = await getStats();

  console.log("\n--- Results Analysis ---");
  console.log(`Successful Claims: ${successful.length}`);
  console.log(`Depleted (404):    ${depleted.length}`);
  console.log(`Unstable (500):    ${unstable.length}`);
  if (others.length > 0) console.log(`Other Errors:      ${others.length}`);
  
  console.log(`\nUnique PreKey IDs: ${uniquePreKeyIds.size}`);
  console.log(`Stats - Before:    ${initialStats.unused} unused`);
  console.log(`Stats - After:     ${finalStats.unused} unused`);

  // 5. Strict Verification Logic
  let passed = true;
  let reason = "";

  if (preKeyIds.length !== uniquePreKeyIds.size) {
    passed = false;
    reason += "❌ RACE DETECTED: Duplicated PreKey IDs returned!\n";
  }

  if (unstable.length > 0) {
    passed = false;
    reason += `❌ INCONCLUSIVE: DB instability detected (${unstable.length} errors).\n`;
  }

  const expectedSuccesses = Math.min(initialStats.unused, concurrency);
  if (successful.length > expectedSuccesses) {
     passed = false;
     reason += `❌ LOGIC ERROR: Successes (${successful.length}) exceeded initial unused count (${initialStats.unused})!\n`;
  }

  if (passed && successful.length + depleted.length === concurrency) {
    console.log("\n✅ PASS: All successful claims were unique, and all failures were clean 404s.");
  } else if (passed) {
    console.log("\n⚠️ WARN: Logic looks okay, but some requests had unexpected results or infrastructure issues.");
  } else {
    console.error(`\n${reason}`);
    process.exit(1);
  }
}

main().catch(console.error);
