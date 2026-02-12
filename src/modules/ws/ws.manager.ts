import type { WebSocket } from "ws";


/**
 * Tracks active WebSocket connections per user.
 * In production, this becomes Redis PubSub or a gateway.
 */
class WsManager {
  private connections = new Map<string, WebSocket>();


  add(userId: string, socket: WebSocket): void {
    this.connections.set(userId, socket);
  }

  remove(userId: string): void {
    this.connections.delete(userId);
  }

  get(userId: string): WebSocket | undefined {
    return this.connections.get(userId);
  }

  isOnline(userId: string): boolean {
    return this.connections.has(userId);
  }
}

export const wsManager = new WsManager();
