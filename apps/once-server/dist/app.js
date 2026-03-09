"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function buildApp() {
    const app = (0, fastify_1.default)({
        logger: true, // Enable logging
    });
    // health check route 
    app.get("/health", async (request, reply) => {
        return { status: "ok" };
    });
    return app;
}
