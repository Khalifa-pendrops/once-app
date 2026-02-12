import "dotenv/config";
import { createClient, type RedisClientType } from "redis";

const url = process.env.REDIS_URL;
if (!url) {
  throw new Error("Oooops! 😏 REDIS_URL is required");
}

/**
 * Singleton Redis client.
 * We connect once during server startup (fail-fast).
 */
export const redis: RedisClientType = createClient({ url });

redis.on("error", (err: unknown) => {
  // Logs errors but doesn't crash the process by itself.
  console.error("This is a Redis client error:", err);
});
