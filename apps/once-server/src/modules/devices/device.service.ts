import { DeviceRepository } from "./device.repository";
import { redis } from "../../redis/client";

export class DeviceService {
  private readonly repo = new DeviceRepository();

  /**
   * Ensures a device belongs to the user and is not revoked.
   * Uses Redis caching (5-min TTL) to reduce DB pressure during WS reconnects.
   */
  async validateDevice(userId: string, deviceId: string): Promise<void> {
    const cacheKey = `device_valid:${userId}:${deviceId}`;

    // 1. Try Cache
    const cached = await redis.get(cacheKey);
    if (cached === "valid") return;

    // 2. Fallback to DB
    const device = await this.repo.findById(deviceId);

    if (!device) {
      throw new Error("Device not found");
    }

    if (device.userId !== userId) {
      throw new Error("Device does not belong to this user");
    }

    if (device.revokedAt) {
      throw new Error("Device has been revoked");
    }

    // 3. Store in Cache (5 minutes)
    await redis.set(cacheKey, "valid", {
      EX: 300, // 5 minutes
    });
  }
}
