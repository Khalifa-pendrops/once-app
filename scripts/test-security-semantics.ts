import axios from "axios";
import WebSocket from "ws";
import { randomUUID } from "node:crypto";

const API_URL = "http://localhost:8080";
const token = process.env.TOKEN;
const deviceA = process.env.DEVICE_A; // online
const deviceB = process.env.DEVICE_B; // offline

if (!token || !deviceA || !deviceB) {
  console.error("TOKEN, DEVICE_A, and DEVICE_B env vars required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "x-device-id": deviceA,
};

async function testPoisonedPreKey() {
  console.log("\n--- Testing Poisoned PreKey Protection ---");
  
  // 1. Claim a PreKey for Device B
  const claimRes = await axios.post(`${API_URL}/prekeys/claim`, { deviceId: deviceB }, { headers });
  const preKeyId = claimRes.data.bundle.oneTimePreKey.id;
  console.log(`Claimed PreKey ${preKeyId} for Device B`);

  // 2. Try to use that PreKey ID for Device A
  try {
    await axios.post(`${API_URL}/messages`, {
      recipientUserId: "3847a926-d8e3-4a35-9294-102277b321db",
      payloads: [
        {
          deviceId: deviceA, // Targeted at A
          nonce: "bm9uY2U=",
          ciphertext: "Y2lwaGVya2V5",
          senderPublicKey: "cHVibGljS2V5",
          preKeyId: preKeyId, // But using B's key!
        },
      ],
    }, { headers });
    console.error("❌ FAIL: Server accepted a PreKey belonging to a different device!");
  } catch (err: any) {
    if (err.response?.status === 500 && err.response?.data?.message?.includes("PREKEY_MISMATCH")) {
       console.log("✅ PASS: Server rejected poisoned PreKey with PREKEY_MISMATCH error");
    } else {
       console.error("❌ FAIL: Unexpected error response:", err.response?.data || err.message);
    }
  }
}

async function testMultiDeviceFanout() {
  console.log("\n--- Testing Multi-Device Fanout & Independent Delivery ---");

  const messageId = randomUUID();
  console.log(`Sending message ${messageId} to Device A (online) and Device B (offline)`);

  // 1. Send 1 message with 2 payloads
  const sendRes = await axios.post(`${API_URL}/messages`, {
    recipientUserId: "3847a926-d8e3-4a35-9294-102277b321db",
    clientMessageId: messageId,
    payloads: [
      {
        deviceId: deviceA,
        nonce: "bm9uY2UtQQ==",
        ciphertext: "RXZlbnQgZm9yIEE=",
        senderPublicKey: "cHVibGljS2V5",
      },
      {
        deviceId: deviceB,
        nonce: "bm9uY2UtQg==",
        ciphertext: "RXZlbnQgZm9yIEI=",
        senderPublicKey: "cHVibGljS2V5",
      }
    ]
  }, { headers });

  const serverMsgId = sendRes.data.messageId;
  console.log("Server messageId:", serverMsgId);

  // 2. ACK for Device A
  console.log("Acknowledging for Device A...");
  await axios.post(`${API_URL}/messages/${serverMsgId}/ack`, {}, { headers: { ...headers, "x-device-id": deviceA } });

  // 3. Verify Device B still has its payload pending
  console.log("Checking pending messages for Device B...");
  const pendingRes = await axios.get(`${API_URL}/messages/pending?deviceId=${deviceB}`, { headers: { ...headers, "x-device-id": deviceB } });
  
  const hasPayloadB = pendingRes.data.messages.some((m: any) => m.messageId === serverMsgId && m.recipientDeviceId === deviceB);
  
  if (hasPayloadB) {
    console.log("✅ PASS: Device B's payload survived Device A's ACK.");
  } else {
    console.error("❌ FAIL: Device B's payload disappeared after Device A's ACK!");
  }
}

async function runTests() {
  try {
    await testPoisonedPreKey();
    await testMultiDeviceFanout();
    console.log("\n--- All Tests Done ---");
  } catch (err: any) {
    console.error("Unexpected Test Error:", err.response?.data || err.message);
  }
}

runTests();
