import axios from "axios";

const API_URL = process.env.BASE_URL ?? "http://localhost:8080";
const deviceId = process.env.DEVICE_ID;
const token = process.env.TOKEN;

if (!token || !deviceId) {
  console.error("TOKEN and DEVICE_ID env vars required");
  process.exit(1);
}

async function testRateLimit() {
  console.log("\n--- Testing Rate Limiting (/messages) ---");
  console.log("Firing 35 requests quickly (limit is 30/min)...");

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-device-id": deviceId,
  };

  let rateLimited = false;
  const requests = Array.from({ length: 35 }).map(async (_, i) => {
    try {
      await axios.post(`${API_URL}/messages`, {
        recipientUserId: "3847a926-d8e3-4a35-9294-102277b321db",
        payloads: [
          {
            deviceId: "dummy-device",
            nonce: "bm9uY2U=",
            ciphertext: "Y2lwaGVya2V5",
            senderPublicKey: "cHVibGljS2V5",
          },
        ],
      }, { headers });
      return { status: 201 };
    } catch (err: any) {
      if (err.response?.status === 429) {
        rateLimited = true;
      }
      return { status: err.response?.status || "ERROR" };
    }
  });

  const results = await Promise.all(requests);
  const statuses = results.map(r => r.status);
  const counts = statuses.reduce((acc: any, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  console.log("Response Statuses:", counts);

  if (rateLimited) {
    console.log("✅ PASS: Received 429 Too Many Requests.");
  } else {
    console.error("❌ FAIL: Did not receive 429. Rate limiting might not be working as expected.");
    process.exit(1);
  }
}

testRateLimit();
