import type { WebSocket } from "ws";

/**
 * userId -> (deviceId -> socket)
 */

class WsManager {
  private readonly connections = new Map<string, Map<string, WebSocket>>();

  add(userId: string, deviceId: string, socket: WebSocket): void {
    let devices = this.connections.get(userId);
    if (!devices) {
      devices = new Map<string, WebSocket>();
      this.connections.set(userId, devices);
    }
    devices.set(deviceId, socket);
  }

  remove(userId: string, deviceId: string): void {
    const devices = this.connections.get(userId);
    if (!devices) return;

    devices.delete(deviceId);
    if (devices.size === 0) {
      this.connections.delete(userId);
    }
  }

  getUserSockets(userId: string): WebSocket[] {
    const devices = this.connections.get(userId);
    if (!devices) return [];
    return [...devices.values()];
  }

  isDeviceOnline(userId: string, deviceId: string): boolean {
    const devices = this.connections.get(userId);
    return devices?.has(deviceId) ?? false;
  }

    revoke(userId: string, deviceId: string): boolean {
    const devices = this.connections.get(userId);
    if (!devices) return false;

    const socket = devices.get(deviceId);
    if (!socket) return false;

    // Close the socket (policy violation / logout)
    socket.close(1008, "Device revoked");

    devices.delete(deviceId);
    if (devices.size === 0) this.connections.delete(userId);

    return true;
  }

  getDeviceSocket(userId: string, deviceId: string): WebSocket | undefined {
    return this.connections.get(userId)?.get(deviceId);
  }

  // Optional helper
  countUserDevices(userId: string): number {
    return this.connections.get(userId)?.size ?? 0;
  }

}

export const wsManager = new WsManager();
