import WebSocket from "ws";

// paste your token here
const token = process.env.TOKEN;
if (!token) throw new Error("Set TOKEN env var");

const ws = new WebSocket(`ws://localhost:8080/ws?token=${encodeURIComponent(token)}`);

ws.on("open", () => {
  console.log("WS open");
  ws.send("ping");
});

ws.on("message", (data) => {
  console.log("WS message:", data.toString());
});

ws.on("close", (code, reason) => {
  console.log("WS closed:", code, reason.toString());
});

ws.on("error", (err) => {
  console.error("WS error:", err);
});
