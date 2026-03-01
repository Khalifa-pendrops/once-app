import "dotenv/config";
import { buildApp } from "./app";
import { redis } from "./redis/client";

const app = buildApp();

const PORT = process.env.PORT || 3000;

// start the http server
async function startServer(): Promise<void> {
  try {
     // connect Redis first
    await redis.connect();
    
    await app.listen({ port: PORT as number, host: "0.0.0.0" });

    console.log(`ONCE server running on port ${PORT}`);

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
