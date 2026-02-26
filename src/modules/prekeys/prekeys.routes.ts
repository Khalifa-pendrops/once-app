import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../database/prisma";
import { DeviceService } from "../devices/device.service";
import { requireAuth } from "../auth/auth.guard";
import { requireDevice } from "../devices/device.guard";

type RegisterBody = {
  deviceId: string;
  keyType: string;
  publicKeys: string[];
};

export const preKeyRoutes: FastifyPluginAsync = async (app) => {
  const deviceService = new DeviceService();

  app.post<{ Body: RegisterBody }>(
    "/prekeys/register",
  { preHandler: [requireAuth, requireDevice] },
    async (request, reply) => {
      const { deviceId, keyType, publicKeys } = request.body;

      if (!deviceId || !keyType || !Array.isArray(publicKeys) || publicKeys.length === 0) {
        return reply.code(400).send({ error: "BAD_REQUEST", message: "deviceId, keyType, publicKeys required" });
      }

      const userId = request.user.sub;

      await deviceService.validateDevice(userId, deviceId);

      const rows = publicKeys.map((pk) => ({
        deviceId,
        keyType,
        publicKey: pk,
      }));

      await prisma.preKey.createMany({
        data: rows,
        skipDuplicates: true, // safe if you later add unique(publicKey)
      });

      return reply.code(201).send({ status: "registered", count: publicKeys.length });
    }
    );
    
        app.post<{
    Body: { deviceId: string };
    }>(
    "/prekeys/claim",
    {
        preHandler: async (request) => {
        await request.jwtVerify();
        },
    },
    async (request, reply) => {
        const { deviceId } = request.body;

        if (!deviceId) {
        return reply.code(400).send({
            error: "BAD_REQUEST",
            message: "deviceId required",
        });
        }

        // 1️⃣ Find one unused prekey
        const prekey = await prisma.$transaction(async (tx) => {
        const candidate = await tx.preKey.findFirst({
            where: {
            deviceId,
            usedAt: null,
            },
            orderBy: {
            createdAt: "asc",
            },
        });

        if (!candidate) return null;

        await tx.preKey.update({
            where: { id: candidate.id },
            data: {
            usedAt: new Date(),
            usedByUserId: request.user.sub,
            },
        });

        return candidate;
        });

        if (!prekey) {
        return reply.code(404).send({
            error: "NO_PREKEY",
            message: "No available prekeys for device",
        });
        }

        return reply.send({
        preKeyId: prekey.id,
        deviceId: prekey.deviceId,
        keyType: prekey.keyType,
        publicKey: prekey.publicKey,
        });
    }
    );
};