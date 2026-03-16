import "dotenv/config";
import { buildApp } from "./app";
import { redis } from "./redis/client";

const app = buildApp();

const PORT = Number(process.env.PORT || 3000);

// start the http server
async function startServer(): Promise<void> {
  try {
    console.log("[STARTUP] Connecting to Redis...");
    await redis.connect();
    console.log("[STARTUP] Redis connected.");

    console.log(`[STARTUP] Starting server on port ${PORT}...`);
    await app.listen({ port: PORT as number, host: "0.0.0.0" });
    console.log(`[STARTUP] ONCE server listening on port ${PORT}`);

    // Graceful Shutdown
    // Ensures that active connections are closed properly before the process exits.
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\n[SHUTDOWN] Received ${signal}. Closing server...`);
        try {
          await app.close();
          await redis.quit();
          console.log("[SHUTDOWN] Connections closed. Goodbye.");
          process.exit(0);
        } catch (err) {
          console.error("[SHUTDOWN] Error during shutdown:", err);
          process.exit(1);
        }
      });
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();
