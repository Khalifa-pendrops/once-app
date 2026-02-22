      import type { FastifyInstance, FastifyPluginAsync } from "fastify";
      import { prisma } from "../../database/prisma";
      import { requireAuth } from "../auth/auth.guard";

    type RegisterKeyBody = {
    deviceId: string;
    keyType: string;
    publicKey: string;
  };

      export const keyRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
        /**
         * Register or replace a device public key.
         */
        app.post<{ Body: RegisterKeyBody }>(
          "/keys/register",
            { preHandler: requireAuth },
          
          async (request, reply) => {
            const userId = request.user.sub;
            const { deviceId, keyType, publicKey } = request.body;

            if (!deviceId?.trim() || !publicKey?.trim() || !keyType?.trim()) {
              return reply.code(400).send({
                error: "INVALID_INPUT",
                message: "deviceId and publicKey are required",
              });
            }

            // Ensure device belongs to this user
            const device = await prisma.device.findUnique({
              where: { id: deviceId },
            });

            if (!device || device.userId !== userId) {
              return reply.code(403).send({
                error: "FORBIDDEN",
                message: "Device not found or not owned by user",
              });
            }

            // Upsert key
        // 1️⃣ Revoke existing active key (if any)
await prisma.publicKey.updateMany({
  where: {
    deviceId,
    keyType,
    revokedAt: null,
  },
  data: {
    revokedAt: new Date(),
  },
});

// 2️⃣ Create new active key
await prisma.publicKey.create({
  data: {
    deviceId,
    keyType,
    publicKey,
  },
});

          return reply.code(201).send({
    status: "registered",
    deviceId,
    keyType,
  });
          }
          );
          
        app.get<{ Params: { userId: string } }>(
    "/keys/:userId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.params;

      const devices = await prisma.device.findMany({
        where: { userId, revokedAt: null },
        select: { id: true },
      });

      const deviceIds = devices.map((d) => d.id);

      if (deviceIds.length === 0) {
        return reply.send({ keys: [] });
      }

      const keys = await prisma.publicKey.findMany({
        where: {
          deviceId: { in: deviceIds },
          revokedAt: null,
          keyType: "x25519",
        },
        select: {
          deviceId: true,
          keyType: true,
          publicKey: true,
        },
      });

      return reply.send({ keys });
    }
  );
        
        app.post<{ Body: { deviceName: string } }>(
      "/devices/register",
      { preHandler: requireAuth },
      async (request, reply) => {
        const userId = request.user.sub;
        const { deviceName } = request.body;

        if (!deviceName?.trim()) {
          return reply.code(400).send({
            error: "INVALID_INPUT",
            message: "deviceName is required",
          });
        }

        const device = await prisma.device.create({
          data: {
            userId,
            deviceName: deviceName.trim(),
          },
        });

        return reply.code(201).send({
          deviceId: device.id,
          deviceName: device.deviceName,
        });
      }
    );



          
          app.get("/debug/keys", async () => {
        const all = await prisma.publicKey.findMany();
        return { all };
      });

      };
