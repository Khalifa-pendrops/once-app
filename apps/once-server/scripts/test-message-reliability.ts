import axios from "axios";
import WebSocket from "ws";
import { randomUUID } from "node:crypto";

const API_URL = "http://localhost:8080";
const WS_URL = "ws://localhost:8080/ws";
const token = process.env.TOKEN;
const deviceId = process.env.DEVICE_ID;

if (!token || !deviceId) {
  console.error("TOKEN and DEVICE_ID env vars required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "x-device-id": deviceId,
};

async function testIdempotency() {
  console.log("\n--- Testing Idempotent Send ---");
  const clientMessageId = randomUUID();
  const payload = {
    recipientUserId: "3847a926-d8e3-4a35-9294-102277b321db", // self for test
    clientMessageId,
    payloads: [
      {
        deviceId: deviceId,
        nonce: "bm9uY2U=",
        ciphertext: "Y2lwaGVya2V5",
        senderPublicKey: "cHVibGljS2V5",
      },
    ],
  };

  const res1 = await axios.post(`${API_URL}/messages`, payload, { headers });
  const id1 = res1.data.messageId;
  console.log("First send messageId:", id1);

  const res2 = await axios.post(`${API_URL}/messages`, payload, { headers });
  const id2 = res2.data.messageId;
  console.log("Second send messageId:", id2);

  if (id1 === id2) {
    console.log("✅ PASS: Idempotency confirmed (same server ID returned)");
  } else {
    console.error("❌ FAIL: Different IDs returned for same clientMessageId");
  }
}

async function testOfflineSync() {
  console.log("\n--- Testing Offline Sync ---");
  
  // 1. Send message while offline
  const clientMessageId = randomUUID();
  await axios.post(`${API_URL}/messages`, {
    recipientUserId: "3847a926-d8e3-4a35-9294-102277b321db",
    clientMessageId,
    payloads: [{
      deviceId: deviceId,
      nonce: "bm9uY2U=",
      ciphertext: "T2ZmbGluZSBTeW5jIFRlc3Q=",
      senderPublicKey: "cHVibGljS2V5",
    }]
  }, { headers });
  console.log("Message sent while offline.");

  // 2. Connect WS and wait for sync
  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token!)}&deviceId=${encodeURIComponent(deviceId!)}`);
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Timeout waiting for sync message"));
    }, 5000);

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "pending") {
        console.log("✅ PASS: Received pending message via sync:", msg.messageId);
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });

    ws.on("error", reject);
  });
}

async function runTests() {
  try {
    await testIdempotency();
    await testOfflineSync();
    console.log("\n--- All Tests Passed! ---");
  } catch (err: any) {
    console.error("Test execution failed:", err.response?.data || err.message);
    process.exit(1);
  }
}

runTests();
