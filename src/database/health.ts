import { prisma } from "./prisma";

// verifies DB connectivity. returns true if DB is reachable, false otherwise

export async function databaseHealthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    // Log the error to help diagnose connectivity issues during development.
    console.error("Database health check failed:", error);
    return false;
  }
}
