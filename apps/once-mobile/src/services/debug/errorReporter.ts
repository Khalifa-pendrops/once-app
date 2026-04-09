import { BASE_URL } from '../../api/client';
import { StorageService, KEYS } from '../storage/secureStorage';

type ClientSeverity = 'info' | 'warn' | 'error' | 'fatal';

type ClientDebugEvent = {
  timestamp: string;
  source: string;
  severity: ClientSeverity;
  code?: string;
  message: string;
  stack?: string;
  route?: string;
  context?: Record<string, unknown>;
};

const LOCAL_DEBUG_EVENTS_KEY = 'once_local_debug_events';
const LOCAL_DEBUG_EVENTS_MAX = 100;

async function appendLocalDebugEvent(event: ClientDebugEvent) {
  try {
    const existing = await StorageService.getItem(LOCAL_DEBUG_EVENTS_KEY);
    const parsed = existing ? (JSON.parse(existing) as ClientDebugEvent[]) : [];
    const next = [event, ...parsed].slice(0, LOCAL_DEBUG_EVENTS_MAX);
    await StorageService.setItem(LOCAL_DEBUG_EVENTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore local debug persistence failures.
  }
}

export async function reportClientError(event: {
  source: string;
  severity?: ClientSeverity;
  code?: string;
  message: string;
  stack?: string;
  route?: string;
  context?: Record<string, unknown>;
}) {
  const debugEvent: ClientDebugEvent = {
    timestamp: new Date().toISOString(),
    source: event.source,
    severity: event.severity ?? 'error',
    code: event.code,
    message: event.message,
    stack: event.stack,
    route: event.route,
    context: event.context,
  };

  await appendLocalDebugEvent(debugEvent);

  try {
    const token = await StorageService.getItem(KEYS.AUTH_TOKEN);
    const deviceId = await StorageService.getItem(KEYS.DEVICE_ID);
    if (!token) return;

    await fetch(`${BASE_URL}/debug/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(deviceId ? { 'x-device-id': deviceId } : {}),
      },
      body: JSON.stringify(debugEvent),
    });
  } catch {
    // Ignore remote reporting failures to avoid affecting user flow.
  }
}

export async function getLocalDebugEvents(): Promise<ClientDebugEvent[]> {
  try {
    const existing = await StorageService.getItem(LOCAL_DEBUG_EVENTS_KEY);
    return existing ? (JSON.parse(existing) as ClientDebugEvent[]) : [];
  } catch {
    return [];
  }
}

export function extractErrorDetails(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack,
    };
  }

  return {
    message: typeof err === 'string' ? err : JSON.stringify(err),
  };
}

export function registerGlobalErrorHandlers() {
  const errorUtils = (globalThis as any).ErrorUtils;
  if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) {
    return;
  }

  const existingHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const details = extractErrorDetails(error);
    void reportClientError({
      source: 'mobile',
      severity: isFatal ? 'fatal' : 'error',
      code: isFatal ? 'UNCAUGHT_FATAL' : 'UNCAUGHT_ERROR',
      message: details.message,
      stack: details.stack,
    });

    if (typeof existingHandler === 'function') {
      existingHandler(error, isFatal);
    }
  });
}
