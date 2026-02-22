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
      // ✅ normalize socket (works across versions)
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

        // ✅ DB-backed device check (must belong to user & not revoked)
        await deviceService.validateDevice(userId, deviceId);

        // ✅ Register socket for (userId, deviceId)
        wsManager.add(userId, deviceId, socket);

        console.log("WS connected:", {
          userId,
          deviceId,
          connectedDevices: wsManager.countUserDevices(userId),
        });

        socket.send(JSON.stringify({ type: "welcome", userId, deviceId }));

        // ✅ Handle messages (we’ll use this for ACK in the next step)
        socket.on("message", async (raw: import("ws").RawData) => {
          const text = raw.toString();

          // ping/pong
          if (text === "ping") {
            socket.send("pong");
            return;
          }

          // ACK support (Step 4.8)
          try {
            const data = JSON.parse(text) as { type?: string; messageId?: string };

            if (data.type === "ack" && typeof data.messageId === "string") {
              // IMPORTANT: use the "device-aware" ack (per device)
              await messageService.ackMessageForDevice(userId, deviceId, data.messageId);

              console.log("ACK received:", { userId, deviceId, messageId: data.messageId });
            }
          } catch {
            // ignore invalid JSON
          }
        });

        socket.on("close", () => {
          wsManager.remove(userId, deviceId);
          console.log("WS closed:", { userId, deviceId });
        });
      } catch (err) {
        console.error("WS ERROR:", err);

        if (err instanceof Error) {
          socket.close(1008, err.message);
        } else {
          socket.close(1008, "Connection rejected");
        }
      }
    }
  );
};