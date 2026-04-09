import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { type DebugEvent, listDebugEvents, recordDebugEvent } from "./debugEvent.service";

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

type DebugQuery = {
  secret?: string;
  limit?: string;
  q?: string;
  source?: string;
  severity?: string;
  code?: string;
  route?: string;
  userId?: string;
  requestId?: string;
  groupBy?: string;
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

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

function normalizeQueryValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseLimit(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 500);
}

function matchesFilter(event: DebugEvent, query: DebugQuery) {
  const search = normalizeQueryValue(query.q)?.toLowerCase();
  const source = normalizeQueryValue(query.source)?.toLowerCase();
  const severity = normalizeQueryValue(query.severity)?.toLowerCase();
  const code = normalizeQueryValue(query.code)?.toLowerCase();
  const route = normalizeQueryValue(query.route)?.toLowerCase();
  const userId = normalizeQueryValue(query.userId)?.toLowerCase();
  const requestId = normalizeQueryValue(query.requestId)?.toLowerCase();

  if (source && event.source.toLowerCase() !== source) return false;
  if (severity && event.severity.toLowerCase() !== severity) return false;
  if (code && (event.code || "").toLowerCase() !== code) return false;
  if (route && !(event.route || "").toLowerCase().includes(route)) return false;
  if (userId && !(event.userId || "").toLowerCase().includes(userId)) return false;
  if (requestId && !(event.requestId || "").toLowerCase().includes(requestId)) return false;

  if (search) {
    const haystack = [
      event.message,
      event.code,
      event.route,
      event.source,
      event.userId,
      event.deviceId,
      event.requestId,
      event.stack,
      event.context ? JSON.stringify(event.context) : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(search)) return false;
  }

  return true;
}

function groupEvents(events: DebugEvent[], groupBy: string | undefined) {
  if (!groupBy || groupBy === "none") return [];

  const buckets = new Map<string, { key: string; count: number; latest: string; sample: DebugEvent }>();

  for (const event of events) {
    const rawKey =
      groupBy === "source"
        ? event.source
        : groupBy === "code"
          ? event.code || "(no code)"
          : groupBy === "route"
            ? event.route || "(no route)"
            : groupBy === "requestId"
              ? event.requestId || "(no request)"
              : undefined;

    if (!rawKey) continue;

    const existing = buckets.get(rawKey);
    if (existing) {
      existing.count += 1;
      if (event.timestamp > existing.latest) {
        existing.latest = event.timestamp;
        existing.sample = event;
      }
      continue;
    }

    buckets.set(rawKey, {
      key: rawKey,
      count: 1,
      latest: event.timestamp,
      sample: event,
    });
  }

  return [...buckets.values()].sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest));
}

function summarize(events: DebugEvent[]) {
  const bySeverity: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const event of events) {
    bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    bySource[event.source] = (bySource[event.source] || 0) + 1;
  }

  return { bySeverity, bySource };
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

    const query = (request.query as DebugQuery) ?? {};
    const limit = parseLimit(query.limit, 100);
    const events = (await listDebugEvents(limit)).filter((event) => matchesFilter(event, query));
    const groups = groupEvents(events, normalizeQueryValue(query.groupBy));
    return reply.send({
      filters: query,
      summary: summarize(events),
      groups,
      events,
    });
  });

  app.get("/debug/errors", async (request, reply) => {
    const denied = assertDebugViewAuthorized(request, reply);
    if (denied) return denied;

    const query = (request.query as DebugQuery) ?? {};
    const secret = normalizeQueryValue(query.secret) || "";
    const limit = parseLimit(query.limit, 150);
    const filteredEvents = (await listDebugEvents(limit)).filter((event) => matchesFilter(event, query));
    const grouped = groupEvents(filteredEvents, normalizeQueryValue(query.groupBy));
    const summary = summarize(filteredEvents);
    const activeGroupBy = normalizeQueryValue(query.groupBy) || "none";

    const filterOptions = {
      q: normalizeQueryValue(query.q) || "",
      source: normalizeQueryValue(query.source) || "",
      severity: normalizeQueryValue(query.severity) || "",
      code: normalizeQueryValue(query.code) || "",
      route: normalizeQueryValue(query.route) || "",
      userId: normalizeQueryValue(query.userId) || "",
      requestId: normalizeQueryValue(query.requestId) || "",
      groupBy: activeGroupBy,
      limit,
    };

    const rows = filteredEvents
      .map((event) => {
        const context = event.context ? JSON.stringify(event.context, null, 2) : "";
        const focusLink = `/debug/errors?${buildQueryString({
          secret,
          q: filterOptions.q,
          source: event.source,
          severity: event.severity,
          code: event.code,
          route: event.route,
          userId: event.userId,
          requestId: event.requestId,
          groupBy: activeGroupBy,
          limit,
        })}`;

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
            <div class="links">
              <a href="${focusLink}">focus this pattern</a>
            </div>
            ${event.stack ? `<pre class="stack">${escapeHtml(event.stack)}</pre>` : ""}
            ${context ? `<pre class="context">${escapeHtml(context)}</pre>` : ""}
          </article>
        `;
      })
      .join("");

    const groupRows = grouped
      .map(
        (group) => `
          <article class="group-card">
            <div class="group-key">${escapeHtml(group.key)}</div>
            <div class="group-meta">
              <span>count: ${group.count}</span>
              <span>latest: ${escapeHtml(group.latest)}</span>
              <span>sample severity: ${escapeHtml(group.sample.severity)}</span>
            </div>
            <div class="group-sample">${escapeHtml(group.sample.message)}</div>
          </article>
        `
      )
      .join("");

    const severitySummary = Object.entries(summary.bySeverity)
      .map(([key, count]) => `<span class="chip">${escapeHtml(key)}: ${count}</span>`)
      .join("");
    const sourceSummary = Object.entries(summary.bySource)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => `<span class="chip">${escapeHtml(key)}: ${count}</span>`)
      .join("");

    const clearHref = `/debug/errors?${buildQueryString({ secret, limit })}`;

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
          .toolbar, .summary, .groups { margin:0 0 20px; }
          .toolbar form { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; background:#0b0b0b; border:1px solid #1d1d1d; padding:16px; }
          .toolbar label { display:block; color:#8B8B8B; font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
          .toolbar input, .toolbar select { width:100%; box-sizing:border-box; background:#000; color:#d4d4d4; border:1px solid #222; padding:10px; font-family:inherit; }
          .toolbar .actions { display:flex; align-items:flex-end; gap:10px; }
          .toolbar button, .toolbar a { display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:0 14px; border:1px solid #3a2d12; background:#0d0d0d; color:#F6C177; text-decoration:none; font-family:inherit; cursor:pointer; }
          .summary-block { background:#0b0b0b; border:1px solid #1d1d1d; padding:14px 16px; margin-bottom:12px; }
          .summary-title { color:#8B8B8B; font-size:11px; text-transform:uppercase; letter-spacing:2px; margin-bottom:10px; }
          .chip-row { display:flex; flex-wrap:wrap; gap:8px; }
          .chip { border:1px solid #23343b; color:#67E8F9; padding:6px 10px; font-size:12px; background:#071116; }
          .groups-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }
          .group-card { border:1px solid #1d1d1d; background:#0b0b0b; padding:14px; }
          .group-key { color:#F6C177; font-size:14px; margin-bottom:8px; word-break:break-word; }
          .group-meta { display:flex; flex-wrap:wrap; gap:10px; color:#8B8B8B; font-size:11px; margin-bottom:8px; }
          .group-sample { color:#d4d4d4; font-size:13px; }
          .event { border:1px solid #222; background:#0b0b0b; padding:16px; margin:0 0 16px; }
          .event-head, .meta { display:flex; flex-wrap:wrap; gap:12px; font-size:12px; margin-bottom:8px; color:#8B8B8B; }
          .severity { color:#67E8F9; text-transform:uppercase; letter-spacing:1px; }
          .message { color:#F6C177; font-size:16px; margin:8px 0 12px; }
          .links { margin:0 0 12px; }
          .links a { color:#67E8F9; text-decoration:none; font-size:12px; }
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
        <section class="toolbar">
          <form method="get" action="/debug/errors">
            <input type="hidden" name="secret" value="${escapeHtml(secret)}" />
            <div>
              <label>Search</label>
              <input type="text" name="q" value="${escapeHtml(filterOptions.q)}" placeholder="message, stack, code, route" />
            </div>
            <div>
              <label>Source</label>
              <input type="text" name="source" value="${escapeHtml(filterOptions.source)}" placeholder="mobile, api, ws, server" />
            </div>
            <div>
              <label>Severity</label>
              <select name="severity">
                <option value="" ${filterOptions.severity === "" ? "selected" : ""}>all</option>
                <option value="info" ${filterOptions.severity === "info" ? "selected" : ""}>info</option>
                <option value="warn" ${filterOptions.severity === "warn" ? "selected" : ""}>warn</option>
                <option value="error" ${filterOptions.severity === "error" ? "selected" : ""}>error</option>
                <option value="fatal" ${filterOptions.severity === "fatal" ? "selected" : ""}>fatal</option>
              </select>
            </div>
            <div>
              <label>Code</label>
              <input type="text" name="code" value="${escapeHtml(filterOptions.code)}" placeholder="HTTP_404" />
            </div>
            <div>
              <label>Route</label>
              <input type="text" name="route" value="${escapeHtml(filterOptions.route)}" placeholder="/auth/login" />
            </div>
            <div>
              <label>User ID</label>
              <input type="text" name="userId" value="${escapeHtml(filterOptions.userId)}" placeholder="user id fragment" />
            </div>
            <div>
              <label>Request ID</label>
              <input type="text" name="requestId" value="${escapeHtml(filterOptions.requestId)}" placeholder="fastify request id" />
            </div>
            <div>
              <label>Group By</label>
              <select name="groupBy">
                <option value="none" ${filterOptions.groupBy === "none" ? "selected" : ""}>none</option>
                <option value="source" ${filterOptions.groupBy === "source" ? "selected" : ""}>source</option>
                <option value="code" ${filterOptions.groupBy === "code" ? "selected" : ""}>code</option>
                <option value="route" ${filterOptions.groupBy === "route" ? "selected" : ""}>route</option>
                <option value="requestId" ${filterOptions.groupBy === "requestId" ? "selected" : ""}>requestId</option>
              </select>
            </div>
            <div>
              <label>Limit</label>
              <input type="number" name="limit" min="1" max="500" value="${escapeHtml(filterOptions.limit)}" />
            </div>
            <div class="actions">
              <button type="submit">Apply Filters</button>
              <a href="${clearHref}">Clear</a>
            </div>
          </form>
        </section>
        <section class="summary">
          <div class="summary-block">
            <div class="summary-title">Visible Events</div>
            <div class="chip-row">
              <span class="chip">count: ${filteredEvents.length}</span>
              <span class="chip">groupBy: ${escapeHtml(activeGroupBy)}</span>
            </div>
          </div>
          <div class="summary-block">
            <div class="summary-title">By Severity</div>
            <div class="chip-row">${severitySummary || '<span class="chip">none</span>'}</div>
          </div>
          <div class="summary-block">
            <div class="summary-title">By Source</div>
            <div class="chip-row">${sourceSummary || '<span class="chip">none</span>'}</div>
          </div>
        </section>
        ${groupRows ? `<section class="groups"><div class="summary-title">Grouped View</div><div class="groups-grid">${groupRows}</div></section>` : ""}
        ${rows || '<p>No events recorded yet.</p>'}
      </body>
      </html>
    `;

    reply.header("content-type", "text/html; charset=utf-8");
    return reply.send(html);
  });
};
