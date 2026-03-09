import { FastifyReply } from "fastify";
import { Prisma } from "@prisma/client";

/**
 * Handles common Prisma errors, specifically connection issues (P1001/P1008).
 * Returns a 503 Service Unavailable for DB outages to allow clean client retries.
 */
export function handlePrismaError(err: any, reply: FastifyReply) {
  // P1001: Can't reach database
  // P1008: Operations timed out
  if (err && typeof err === "object" && (err.code === "P1001" || err.code === "P1008")) {
    return reply.code(503).send({
      error: "DB_UNAVAILABLE",
      message: "Temporary database connectivity issue. Please retry shortly.",
      code: err.code,
    });
  }

  // Fallback to 500 for other unexpected errors
  console.error("Unhandled Database Error:", err);
  return reply.code(500).send({
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected database error occurred.",
  });
}
