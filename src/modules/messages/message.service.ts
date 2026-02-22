import type { CreateEncryptedMessageInput, CreateMessageResult } from "./message.types";
import { MessageRepository } from "./message.repository";
import { wsManager } from "../ws/ws.manager";

export class MessageService {
  private readonly repo = new MessageRepository();

  async createEncryptedMessage(input: CreateEncryptedMessageInput): Promise<CreateMessageResult> {
    if (!input.recipientUserId?.trim()) throw new Error("recipientUserId is required");
    if (!Array.isArray(input.payloads) || input.payloads.length === 0) {
      throw new Error("payloads is required");
    }

    const created = await this.repo.createEncrypted(input);

    // Push best-effort (server still stores as TTL backup)
    const sockets = wsManager.getUserSockets(input.recipientUserId.trim());
    for (const p of input.payloads) {
      for (const socket of sockets) {
        socket.send(
          JSON.stringify({
            type: "message",
            messageId: created.messageId,
            deviceId: p.deviceId,
            nonce: p.nonce,
            ciphertext: p.ciphertext,
            senderPublicKey: p.senderPublicKey,
          })
        );
      }
    }

    // NOTE: we are NOT auto-acking here because we pushed to user sockets (not device-targeted).
    // Once you switch wsManager to (userId, deviceId) sockets, then you can ack per device after delivery.

    return created;
  }

  async listPendingForDevice(userId: string, deviceId: string) {
    if (!userId?.trim()) throw new Error("recipientUserId is required");
    if (!deviceId?.trim()) throw new Error("deviceId is required");
    return this.repo.listPendingForDevice(userId.trim(), deviceId.trim());
  }

  async pullPendingForDevice(userId: string, deviceId: string) {
    if (!userId?.trim()) throw new Error("recipientUserId is required");
    if (!deviceId?.trim()) throw new Error("deviceId is required");
    return this.repo.pullPendingForDevice(userId.trim(), deviceId.trim());
  }

  async ackMessageForDevice(userId: string, deviceId: string, messageId: string) {
    if (!userId?.trim()) throw new Error("recipientUserId is required");
    if (!deviceId?.trim()) throw new Error("deviceId is required");
    if (!messageId?.trim()) throw new Error("messageId is required");
    await this.repo.ackForDevice(userId.trim(), deviceId.trim(), messageId.trim());

      const deleted = await this.repo.ackForDevice(userId, deviceId, messageId);

  if (!deleted) {
    console.warn("ACK failed (not found):", { userId, deviceId, messageId });
  }
  }
}