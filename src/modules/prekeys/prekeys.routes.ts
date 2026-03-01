import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../database/prisma";
import { DeviceService } from "../devices/device.service";
import { requireAuth } from "../auth/auth.guard";
import { requireDevice } from "../devices/device.guard";

import { handlePrismaError } from "../../utils/errors";

type RegisterBody = {
  deviceId: string;
  keyType: string;
  publicKeys: string[];
};

const registerSchema = {
  body: {
    type: "object",
    required: ["deviceId", "keyType", "publicKeys"],
    properties: {
      deviceId: { type: "string" },
      keyType: { type: "string" },
      publicKeys: {
        type: "array",
        minItems: 1,
        maxItems: 100, // Reasonable batch limit
        items: { type: "string", maxLength: 256 },
      },
    },
  },
};

export const preKeyRoutes: FastifyPluginAsync = async (app) => {
  const deviceService = new DeviceService();

  app.post<{ Body: RegisterBody }>(
    "/prekeys/register",
    {
      preHandler: [requireAuth, requireDevice],
      schema: registerSchema,
      config: {
        rateLimit: {
          max: 10, // 10 batches per minute
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      try {
        const { deviceId, keyType, publicKeys } = request.body;

        const userId = request.user.sub;

        await deviceService.validateDevice(userId, deviceId);

        const rows = publicKeys.map((pk) => ({
          deviceId,
          keyType,
          publicKey: pk,
        }));

        //  PreKey Hygiene: Register new keys & cleanup old unused ones in one transaction
        const MAX_PREKEYS_PER_DEVICE = 100;
        
        await prisma.$transaction(async (tx) => {
          // 1. Create new prekeys
          await tx.preKey.createMany({
            data: rows,
            skipDuplicates: true,
          });

          // 2. Professional Cleanup: Keep only the latest N unused prekeys to prevent bloat.
          // Using `notIn` ensures we keep exactly N keys even with timestamp collisions.
          const keep = await tx.preKey.findMany({
            where: { deviceId, usedAt: null },
            orderBy: { createdAt: "desc" },
            take: MAX_PREKEYS_PER_DEVICE,
            select: { id: true },
          });

          const keepIds = keep.map((k) => k.id);

          await tx.preKey.deleteMany({
            where: {
              deviceId,
              usedAt: null,
              id: { notIn: keepIds },
            },
          });
        });

        return reply.code(201).send({ status: "registered", count: publicKeys.length });
      } catch (err) {
        return handlePrismaError(err, reply);
      }
    }
  );

  //  STATS: Only available in non-production environments OR if explicitly enabled
  const isDebugEnabled = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEBUG_ROUTES === "true";
  if (isDebugEnabled) {
    app.get(
      "/prekeys/stats",
      {
        preHandler: [requireAuth, requireDevice],
        config: {
          rateLimit: {
            max: 20,
            timeWindow: "1 minute",
          },
        },
      },
      async (request, reply) => {
        try {
          const q = request.query as { deviceId?: string };
          const deviceId = q.deviceId;

          if (!deviceId) {
            return reply.code(400).send({ error: "BAD_REQUEST", message: "deviceId required" });
          }

          const userId = request.user.sub;
          await deviceService.validateDevice(userId, deviceId);

          const [unused, used, total, unusedOldest, unusedNewest] = await prisma.$transaction([
            prisma.preKey.count({ where: { deviceId, usedAt: null } }),
            prisma.preKey.count({ where: { deviceId, usedAt: { not: null } } }),
            prisma.preKey.count({ where: { deviceId } }),
            prisma.preKey.findFirst({
              where: { deviceId, usedAt: null },
              orderBy: { createdAt: "asc" },
              select: { createdAt: true },
            }),
            prisma.preKey.findFirst({
              where: { deviceId, usedAt: null },
              orderBy: { createdAt: "desc" },
              select: { createdAt: true },
            }),
          ]);

          return reply.send({
            deviceId,
            total,
            unused,
            used,
            unusedOldestCreatedAt: unusedOldest?.createdAt ?? null,
            unusedNewestCreatedAt: unusedNewest?.createdAt ?? null,
          });
        } catch (err) {
          return handlePrismaError(err, reply);
        }
      }
    );
  }

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
      try {
        const { deviceId } = request.body;

        if (!deviceId) {
          return reply.code(400).send({
            error: "BAD_REQUEST",
            message: "deviceId required",
          });
        }

        //  Find one unused prekey + fetch device public keys (Bundle Claim)
          //  Professional Claim Logic: Atomic "claim & burn" using SKIP LOCKED.
          const claimed = await prisma.$queryRaw<any[]>`
            UPDATE pre_keys
            SET "usedAt" = NOW(), "usedByUserId" = ${request.user.sub}
            WHERE id = (
              SELECT id FROM pre_keys
              WHERE "deviceId" = ${deviceId} AND "usedAt" IS NULL
              ORDER BY "createdAt" ASC
              LIMIT 1
              FOR UPDATE SKIP LOCKED
            )
            RETURNING *;
          `;

          const prekey = claimed[0] || null;

        if (!prekey) {
          return reply.code(404).send({
            error: "NO_PREKEY",
            message: "No available prekeys for device",
          });
        }

        //  Fetch device's stable public keys (Identity Key / Signed PreKey)
        const deviceKeys = await prisma.publicKey.findMany({
          where: { deviceId },
          select: { keyType: true, publicKey: true },
        });

        return reply.send({
          bundle: {
            identityKeys: deviceKeys,
            oneTimePreKey: {
              id: prekey.id,
              keyType: prekey.keyType,
              publicKey: prekey.publicKey,
            },
          },
          deviceId: prekey.deviceId,
        });
      } catch (err) {
        return handlePrismaError(err, reply);
      }
    }
  );
};