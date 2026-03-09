import { redis } from "./client";

/**
 * this returns true if Redis is reachable.
 */

export async function redisHealthCheck(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
