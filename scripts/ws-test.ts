import WebSocket from "ws";

const token = process.env.TOKEN;
const deviceId = process.env.DEVICE_ID;

if (!token) throw new Error("Set TOKEN env var");
if (!deviceId) throw new Error("Set DEVICE_ID env var");

const ws = new WebSocket(
  `ws://localhost:8080/ws?token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(deviceId)}`
);

ws.on("open", () => {
  console.log("WS open");
});


// ws.on("message", (data) => {
//   console.log("WS message:", data.toString());
// });

ws.on("message", (data) => {
  const text = data.toString();
  console.log("WS message:", text);

  try {
    const parsed = JSON.parse(text);

    if (parsed.type === "message") {
      ws.send(
        JSON.stringify({
          type: "ack",
          messageId: parsed.messageId,
        })
      );

      console.log("ACK sent:", parsed.messageId);
    }
  } catch {}
});

ws.on("close", (code, reason) => {
  console.log("WS closed:", code, reason.toString());
});

ws.on("error", (err) => {
  console.error("WS error:", err);
});
