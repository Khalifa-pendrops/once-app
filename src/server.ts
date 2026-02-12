import "dotenv/config";
import { buildApp } from "./app";
import { redis } from "./redis/client";

const app = buildApp();

const PORT = process.env.PORT || 3000;

// start the http server
async function startServer(): Promise<void> {
  try {

     // ✅ connect Redis first
    await redis.connect();

    
    await app.listen({ port: PORT as number, host: "0.0.0.0" });

    console.log(`ONCE server running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();
