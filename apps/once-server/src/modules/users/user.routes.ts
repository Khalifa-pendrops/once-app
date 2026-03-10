import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { prisma } from "../../database/prisma";
import { requireAuth } from "../auth/auth.guard";

export const userRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * Search for a user by email.
   * Returns public metadata (ID, email) if found.
   */
  app.get<{ Querystring: { email: string } }>(
    "/search",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { email } = request.query;

      if (!email || !email.includes("@")) {
        return reply.code(400).send({
          error: "INVALID_INPUT",
          message: "A valid email is required.",
        });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: {
          id: true,
          email: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: "User not found.",
        });
      }

      return reply.send(user);
    }
  );
};
