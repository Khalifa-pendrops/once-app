import Fastify, { FastifyInstance } from "fastify";
import { databaseHealthCheck } from "./database/health";
import { authRoutes } from "./modules/auth/auth.routes";
import dotenv from "dotenv";
import fastifyJwt from "@fastify/jwt";
import { redisHealthCheck } from "./redis/health";
import { messageRoutes } from "./modules/messages/message.routes";
import fastifyWebsocket from "@fastify/websocket";
import { wsRoutes } from "./modules/ws/ws.routes";
import { deviceRoutes } from "./modules/devices/device.routes";
import { keyRoutes } from "./modules/keys/key.routes";
import { preKeyRoutes } from "./modules/prekeys/prekeys.routes";




dotenv.config();

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true, // Enable logging
  });

   //  Register JWT plugin FIRST
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET as string,
  });

  app.get("/db-health", async (request, reply) => {
    const dbOk = await databaseHealthCheck();

    if (!dbOk) {
      reply.code(503);
    }

    return {
      status: dbOk ? "OK! Database is reachable" : "Database is unreachable",
      database: dbOk ? "Connected" : "Down",
    };
  });

  // health check route
  app.get("/health", async (request, reply) => {
    return { status: "ok" };
  });

  app.get("/redis-health", async () => {
  const ok = await redisHealthCheck();
  return {
    status: ok ? "Redis is reachable" : "Redis is unreachable",
    redis: ok ? "Up" : "Down",
  };
  });
  
  app.register(messageRoutes);
  app.register(fastifyWebsocket);
  app.register(wsRoutes);
  app.register(deviceRoutes);
  app.register(keyRoutes);
  app.register(preKeyRoutes);


  // All auth endpoints live under /auth/*
  app.register(authRoutes, { prefix: "/auth" });

  return app;
}
