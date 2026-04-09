import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { listDebugEvents, recordDebugEvent } from "./debugEvent.service";

type DebugEventBody = {
  severity?: "info" | "warn" | "error" | "fatal";
  source?: string;
  code?: string;
  message?: string;
  stack?: string;
  route?: string;
  requestId?: string;
  context?: Record<string, unknown>;
};

function assertDebugViewAuthorized(request: any, reply: any) {
  const configuredSecret = process.env.DEBUG_VIEW_SECRET?.trim();
  if (!configuredSecret) {
    return reply.code(503).send({
      error: "DEBUG_VIEW_DISABLED",
      message: "DEBUG_VIEW_SECRET is not configured on the server.",
    });
  }

  const providedSecret =
    request.headers["x-debug-secret"] ||
    request.query?.secret;

  if (providedSecret !== configuredSecret) {
    return reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Missing or invalid debug secret.",
    });
  }

  return null;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractBearerToken(authorizationHeader: unknown): string | null {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

export const debugRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: DebugEventBody }>(
    "/debug/events",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
          keyGenerator: (request: any) =>
            request.headers["x-device-id"] ||
            request.ip,
        },
      },
    },
    async (request, reply) => {
      const body = request.body ?? {};

      if (!body.message?.trim()) {
        return reply.code(400).send({
          error: "INVALID_INPUT",
          message: "message is required.",
        });
      }

      let userId: string | undefined;
      const bearerToken = extractBearerToken(request.headers.authorization);

      if (bearerToken) {
        try {
          const payload = app.jwt.verify<{ sub: string }>(bearerToken);
          userId = payload.sub;
        } catch {
          userId = undefined;
        }
      }

      const event = await recordDebugEvent({
        severity: body.severity ?? "error",
        source: body.source ?? "mobile",
        code: body.code,
        message: body.message.trim(),
        stack: body.stack,
        route: body.route,
        requestId: body.requestId,
        userId,
        deviceId:
          typeof request.headers["x-device-id"] === "string"
            ? request.headers["x-device-id"]
            : undefined,
        context: body.context,
      });

      return reply.code(201).send({ ok: true, eventId: event.id });
    }
  );

  app.get("/debug/errors.json", async (request, reply) => {
    const denied = assertDebugViewAuthorized(request, reply);
    if (denied) return denied;

    const limit = Number((request.query as { limit?: string })?.limit ?? "100");
    const events = await listDebugEvents(Math.min(Math.max(limit, 1), 500));
    return reply.send({ events });
  });

  app.get("/debug/errors", async (request, reply) => {
    const denied = assertDebugViewAuthorized(request, reply);
    if (denied) return denied;

    const events = await listDebugEvents(150);
    const rows = events
      .map((event) => {
        const context = event.context ? JSON.stringify(event.context, null, 2) : "";
        return `
          <article class="event severity-${escapeHtml(event.severity)}">
            <div class="event-head">
              <span class="severity">${escapeHtml(event.severity)}</span>
              <span class="source">${escapeHtml(event.source)}</span>
              <span class="time">${escapeHtml(event.timestamp)}</span>
            </div>
            <div class="message">${escapeHtml(event.message)}</div>
            <div class="meta">
              <span>code: ${escapeHtml(event.code || "-")}</span>
              <span>route: ${escapeHtml(event.route || "-")}</span>
              <span>user: ${escapeHtml(event.userId || "-")}</span>
              <span>device: ${escapeHtml(event.deviceId || "-")}</span>
              <span>request: ${escapeHtml(event.requestId || "-")}</span>
            </div>
            ${event.stack ? `<pre class="stack">${escapeHtml(event.stack)}</pre>` : ""}
            ${context ? `<pre class="context">${escapeHtml(context)}</pre>` : ""}
          </article>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ONCE Debug Errors</title>
        <style>
          body { background:#050505; color:#d4d4d4; font-family: Consolas, Monaco, monospace; margin:0; padding:24px; }
          h1 { color:#F6C177; font-size:28px; margin:0 0 8px; }
          .sub { color:#8B8B8B; margin:0 0 24px; text-transform:uppercase; letter-spacing:2px; font-size:12px; }
          .event { border:1px solid #222; background:#0b0b0b; padding:16px; margin:0 0 16px; }
          .event-head, .meta { display:flex; flex-wrap:wrap; gap:12px; font-size:12px; margin-bottom:8px; color:#8B8B8B; }
          .severity { color:#67E8F9; text-transform:uppercase; letter-spacing:1px; }
          .message { color:#F6C177; font-size:16px; margin:8px 0 12px; }
          .stack, .context { white-space:pre-wrap; overflow:auto; background:#000; padding:12px; border:1px solid #1d1d1d; color:#cfcfcf; }
          .severity-fatal { border-color:#EF4444; }
          .severity-error { border-color:#5b2f2f; }
          .severity-warn { border-color:#6b5b1d; }
          .severity-info { border-color:#1d3f5b; }
        </style>
      </head>
      <body>
        <h1>ONCE Debug Errors</h1>
        <p class="sub">central error stream for mobile, api, ws, and server faults</p>
        ${rows || '<p>No events recorded yet.</p>'}
      </body>
      </html>
    `;

    reply.header("content-type", "text/html; charset=utf-8");
    return reply.send(html);
  });
};
