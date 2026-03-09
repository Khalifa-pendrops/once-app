import type { FastifyReply, FastifyRequest } from "fastify";
import { DeviceService } from "./device.service";

const deviceService = new DeviceService();

export async function requireDevice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user.sub;
  const deviceId = request.headers["x-device-id"];

  if (typeof deviceId !== "string" || !deviceId.trim()) {
    reply.code(400).send({
      error: "MISSING_DEVICE_ID",
      message: "x-device-id header is required",
    });
    return;
  }

  try {
    await deviceService.validateDevice(userId, deviceId.trim());
    // attach for later handlers
    (request as FastifyRequest & { deviceId: string }).deviceId = deviceId.trim();
  } catch (e) {
    reply.code(403).send({
      error: "INVALID_DEVICE",
      message: e instanceof Error ? e.message : "Invalid device",
    });
  }
}