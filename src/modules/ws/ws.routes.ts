  import type { FastifyInstance, FastifyPluginAsync } from "fastify";
  import { wsManager } from "./ws.manager";
  import { DeviceService } from "../devices/device.service";


  export const wsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {

    app.get(
      "/ws",
      { websocket: true },
      async (connection, request) => {



        try {

          const q = request.query as { token?: string; deviceId?: string };
          const token = q.token;
          const deviceId = q.deviceId;

          // DB-backed device check
          const deviceService = new DeviceService();

          if (!token) { connection.close(1008, "Missing token"); return; }
          if (!deviceId) { connection.close(1008, "Missing deviceId"); return; }

          const payload = app.jwt.verify<{ sub: string }>(token);
          const userId = payload.sub;

          // Only then allow socket
          await deviceService.validateDevice(userId, deviceId);


          wsManager.add(userId, deviceId, connection);

          connection.send(JSON.stringify({ type: "welcome", userId, deviceId }));

          connection.on("close", () => wsManager.remove(userId, deviceId));

        } catch (err) {
          console.error("WS ERROR:", err);
          connection.close(1008, "Invalid token");
        }
      }
    );
  };
