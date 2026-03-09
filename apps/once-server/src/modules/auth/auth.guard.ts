import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Verifies JWT and populates request.user.
 * Reusable as a preHandler across routes.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    void reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Sorry, there's a missing or invalid token.",
    });
  }
}
