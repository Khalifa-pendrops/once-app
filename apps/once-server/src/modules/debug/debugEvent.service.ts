import { randomUUID } from "node:crypto";
import { redis } from "../../redis/client";

export type DebugSeverity = "info" | "warn" | "error" | "fatal";
export type DebugSource = "server" | "mobile" | "ws" | "api" | "auth" | "messages" | "storage";

export type DebugEvent = {
  id: string;
  timestamp: string;
  severity: DebugSeverity;
  source: DebugSource | string;
  code?: string;
  message: string;
  stack?: string;
  route?: string;
  requestId?: string;
  userId?: string;
  deviceId?: string;
  context?: Record<string, unknown>;
};

const DEBUG_EVENTS_KEY = "once:debug:error-events";
const DEBUG_EVENTS_MAX = 500;

function normalizeUnknownError(err: unknown) {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack,
      name: err.name,
    };
  }

  return {
    message: typeof err === "string" ? err : JSON.stringify(err),
    stack: undefined,
    name: "UnknownError",
  };
}

export async function recordDebugEvent(
  partial: Omit<DebugEvent, "id" | "timestamp"> & { timestamp?: string }
): Promise<DebugEvent> {
  const event: DebugEvent = {
    id: randomUUID(),
    timestamp: partial.timestamp ?? new Date().toISOString(),
    severity: partial.severity,
    source: partial.source,
    code: partial.code,
    message: partial.message,
    stack: partial.stack,
    route: partial.route,
    requestId: partial.requestId,
    userId: partial.userId,
    deviceId: partial.deviceId,
    context: partial.context,
  };

  await redis.lPush(DEBUG_EVENTS_KEY, JSON.stringify(event));
  await redis.lTrim(DEBUG_EVENTS_KEY, 0, DEBUG_EVENTS_MAX - 1);

  return event;
}

export async function recordServerErrorEvent(args: {
  err: unknown;
  source?: DebugSource | string;
  severity?: DebugSeverity;
  code?: string;
  route?: string;
  requestId?: string;
  userId?: string;
  deviceId?: string;
  context?: Record<string, unknown>;
}) {
  const normalized = normalizeUnknownError(args.err);

  return recordDebugEvent({
    severity: args.severity ?? "error",
    source: args.source ?? "server",
    code: args.code ?? normalized.name,
    message: normalized.message,
    stack: normalized.stack,
    route: args.route,
    requestId: args.requestId,
    userId: args.userId,
    deviceId: args.deviceId,
    context: args.context,
  });
}

export async function listDebugEvents(limit = 100): Promise<DebugEvent[]> {
  const raw = await redis.lRange(DEBUG_EVENTS_KEY, 0, Math.max(0, limit - 1));
  return raw
    .map((value) => {
      try {
        return JSON.parse(value) as DebugEvent;
      } catch {
        return null;
      }
    })
    .filter((value): value is DebugEvent => !!value);
}
