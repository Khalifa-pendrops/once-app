        import type { FastifyInstance, FastifyPluginAsync } from "fastify";
        import { requireAuth } from "../auth/auth.guard";
        import { wsManager } from "../ws/ws.manager";
        import { prisma } from "../../database/prisma";


        type RevokeBody = Readonly<{
        deviceId: string;
        }>;

        export const deviceRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
        app.post<{ Body: RevokeBody }>(
            "/devices/revoke",
            { preHandler: requireAuth },
            async (request, reply) => {
            const userId = request.user.sub;
            const deviceId = request.body.deviceId?.trim();

            if (!deviceId) {
                return reply.code(400).send({
                error: "INVALID_INPUT",
                message: "deviceId is required",
                });
            }

                const revoked = wsManager.revoke(userId, deviceId);
                
                await prisma.device.update({
        where: { id: deviceId },
        data: { revokedAt: new Date() },
        });


            return reply.code(200).send({
                status: revoked ? "revoked" : "not_connected",
                deviceId,
            });
            }
            );
            
            app.get(
    "/devices/me",
    { preHandler: requireAuth },
    async (request, reply) => {
        const userId = request.user.sub;

        const devices = await prisma.device.findMany({
        where: { userId },
        select: {
            id: true,
            deviceName: true,
            revokedAt: true,
        },
        });

        return reply.send({ devices });
    }
    );

        };
