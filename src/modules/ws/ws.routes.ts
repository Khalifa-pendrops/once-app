import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { wsManager } from "./ws.manager";

export const wsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  console.log("WS ROUTES REGISTERED ✅");

  app.get(
    "/ws",
    { websocket: true },
    async (connection, request) => {
      console.log("WS HANDLER HIT ✅");

      try {
        const token = (request.query as { token?: string }).token;
        console.log("Token received?", !!token);

        if (!token) {
          connection.close(1008, "Missing token");
          return;
        }

        const payload = app.jwt.verify<{ sub: string }>(token);

        const userId = payload.sub;
        console.log("UserId:", userId);

        // ✅ Register socket directly
        wsManager.add(userId, connection);

        // ✅ Send welcome directly
        connection.send(
          JSON.stringify({
            type: "welcome",
            userId,
          })
        );

        console.log("Welcome sent");

        connection.on("close", () => {
          console.log("Socket closed:", userId);
          wsManager.remove(userId);
        });

        connection.on("message", (raw: any) => {
          if (raw.toString() === "ping") {
            connection.send("pong");
          }
        });
      } catch (err) {
        console.error("WS ERROR:", err);
        connection.close(1008, "Invalid token");
      }
    }
  );
};
