import WebSocket from "ws";

const WS_URL = "ws://localhost:8080/ws";
const token = process.env.TOKEN;
const deviceId = process.env.DEVICE_ID;

if (!token || !deviceId) {
  console.error("TOKEN and DEVICE_ID env vars required");
  process.exit(1);
}

async function testWsAck() {
  console.log(`Connecting to ${WS_URL}?token=...&deviceId=${deviceId}`);
  const ws = new WebSocket(`${WS_URL}?token=${token}&deviceId=${deviceId}`);

  ws.on("open", () => {
    console.log("✅ WebSocket connected via TCP.");
  });

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    console.log("📩 Received from server:", msg);

    if (msg.type === "welcome") {
      console.log("👋 Received welcome message. Sending ACK...");
      // Simulate an ACK for a dummy messageId
      const dummyMessageId = "00000000-0000-0000-0000-000000000000";
      ws.send(JSON.stringify({ type: "ack", messageId: dummyMessageId }));
    }

    if (msg.type === "ack_ok" && msg.messageId === "00000000-0000-0000-0000-000000000000") {
      console.log("✅ PASS: Received ack_ok for the dummy message.");
      ws.close();
      process.exit(0);
    }
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err);
  });

  ws.on("close", () => {
    console.log("🚪 WebSocket closed.");
  });

  // Timeout after 10s
  setTimeout(() => {
    console.error("❌ TIMEOUT: Did not receive ack_ok within 10 seconds.");
    ws.close();
    process.exit(1);
  }, 10000);
}

testWsAck();
