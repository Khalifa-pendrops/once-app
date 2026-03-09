"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const app = (0, app_1.buildApp)();
const PORT = process.env.PORT || 3000;
// start the http server
async function startServer() {
    try {
        await app.listen({ port: PORT, host: "0.0.0.0" });
        console.log(`ONCE server running on port ${PORT}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
startServer();
