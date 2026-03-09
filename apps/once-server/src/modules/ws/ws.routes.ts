import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { wsManager } from "./ws.manager";
import { DeviceService } from "../devices/device.service";
import { MessageService } from "../messages/message.service";

// Minimal shape for fastify websocket connection object
type WsConnection = {
  socket: import("ws").WebSocket;
};

export const wsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const deviceService = new DeviceService();
  const messageService = new MessageService();

  app.get(
    "/ws",
    { websocket: true },
    async (connection: WsConnection | any, request) => {
      // normalize socket (works across versions)
      const socket: import("ws").WebSocket = connection?.socket ?? connection;

      try {
        const q = request.query as { token?: string; deviceId?: string };
        const token = q.token;
        const deviceId = q.deviceId;

        if (!token) {
          socket.close(1008, "Missing token");
          return;
        }
        if (!deviceId) {
          socket.close(1008, "Missing deviceId");
          return;
        }

        const payload = app.jwt.verify<{ sub: string }>(token);
        const userId = payload.sub;

        // DB-backed device check (must belong to user & not revoked)
        await deviceService.validateDevice(userId, deviceId);

        // Register socket for (userId, deviceId)
        wsManager.add(userId, deviceId, socket);

        console.log("WS connected:", {
          userId,
          deviceId,
          connectedDevices: wsManager.countUserDevices(userId),
        });

        // Handle incoming messages (e.g. ACK)
        // Register listener as early as possible to avoid race conditions
        socket.on("message", async (raw: import("ws").RawData) => {
          const text = raw.toString();

          if (text === "ping") {
            socket.send("pong");
            return;
          }

          try {
            const data = JSON.parse(text) as { type?: string; messageId?: string };

            if (data.type === "ack" && typeof data.messageId === "string") {
              await messageService.ackMessageForDevice(userId, deviceId, data.messageId);
              socket.send(JSON.stringify({ type: "ack_ok", messageId: data.messageId }));
              console.log("ACK received:", { userId, deviceId, messageId: data.messageId });
            }
          } catch (err: any) {
             if (err?.code === "P1001" || err?.code === "P1008") {
               console.error("DB down during ACK:", err.code);
             }
          }
        });

        socket.send(JSON.stringify({ type: "welcome", userId, deviceId }));

        // Offline Sync: Fetch and push pending messages on connect
        const pending = await messageService.listPendingForDevice(userId, deviceId);
        if (pending.length > 0) {
          console.log(`Syncing ${pending.length} pending messages for device: ${deviceId}`);
          for (const msg of pending) {
            socket.send(JSON.stringify({ type: "pending", ...msg }));
            await messageService.markDelivered(userId, deviceId, msg.messageId);
          }
        }

        socket.on("close", () => {
          wsManager.remove(userId, deviceId);
          console.log("WS closed:", { userId, deviceId });
        });
      } catch (err: any) {
        console.error("WS ERROR:", err);

        // Handle DB Outage specifically
        if (err?.code === "P1001" || err?.code === "P1008") {
          socket.close(1011, "DB_DOWN"); // 1011: internal error / service restart
          return;
        }

        if (err instanceof Error) {
          socket.close(1008, err.message);
        } else {
          socket.close(1008, "Connection rejected");
        }
      }
    }
  );
};