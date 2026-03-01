import { prisma } from "../../database/prisma";
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

    //  Security: Enforce preKeyId belongs to recipient device (prevent poisoned prekeys)
    for (const p of input.payloads) {
      if (p.preKeyId) {
        const pk = await prisma.preKey.findUnique({
          where: { id: p.preKeyId },
          select: { deviceId: true },
        });
        if (!pk || pk.deviceId !== p.deviceId) {
          throw new Error(`PREKEY_MISMATCH: PreKey ${p.preKeyId} does not belong to device ${p.deviceId}`);
        }
      }
    }

    const created = await this.repo.createEncrypted(input);
    
    // Structured Logging: Message Accepted
    console.log(`[MESSAGE_ACCEPTED] messageId=${created.messageId} sender=${input.senderUserId}/${input.senderDeviceId} recipient=${input.recipientUserId} event=accepted transport=http payloads=${input.payloads.length}`);

    for (const p of input.payloads) {
      const targetSocket = wsManager.getDeviceSocket(input.recipientUserId.trim(), p.deviceId.trim());
      
      if (targetSocket) {
        targetSocket.send(
          JSON.stringify({
            type: "message",
            messageId: created.messageId,
            senderUserId: input.senderUserId,
            senderDeviceId: input.senderDeviceId,
            recipientUserId: input.recipientUserId,
            recipientDeviceId: p.deviceId,
            nonce: p.nonce,
            ciphertext: p.ciphertext,
            senderPublicKey: p.senderPublicKey,
            preKeyId: p.preKeyId ?? null,
            createdAt: created.createdAt,
            expiresAt: created.expiresAt,
          })
        );

        //  Mark as delivered
        await this.repo.markDelivered(input.recipientUserId, p.deviceId, created.messageId);
        
        // Structured Logging: Message Delivered (Sync)
        console.log(`[MESSAGE_DELIVERED] messageId=${created.messageId} sender=${input.senderUserId}/${input.senderDeviceId} recipient=${input.recipientUserId}/${p.deviceId} event=delivered transport=ws`);
      }
    }

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
    
    const messages = await this.repo.pullPendingForDevice(userId.trim(), deviceId.trim());
    
    //  Structured Logging: Message Delivered (Pull)
    for (const msg of messages) {
      console.log(`[MESSAGE_DELIVERED] messageId=${msg.messageId} sender=${msg.senderUserId}/${msg.senderDeviceId} recipient=${msg.recipientUserId}/${msg.recipientDeviceId} event=delivered transport=pull`);
    }
    
    return messages;
  }

  async ackMessageForDevice(userId: string, deviceId: string, messageId: string) {
    if (!userId?.trim()) throw new Error("recipientUserId is required");
    if (!deviceId?.trim()) throw new Error("deviceId is required");
    if (!messageId?.trim()) throw new Error("messageId is required");
    
    await this.repo.ackForDevice(userId.trim(), deviceId.trim(), messageId.trim());
    
    // Structured Logging: Message Acked
    console.log(`[MESSAGE_ACKED] messageId=${messageId} recipient=${userId}/${deviceId} event=acked`);
  }

  async markDelivered(userId: string, deviceId: string, messageId: string) {
    await this.repo.markDelivered(userId, deviceId, messageId);
    
    // Structured Logging: Message Delivered (Sync on Connect)
    console.log(`[MESSAGE_DELIVERED] messageId=${messageId} recipient=${userId}/${deviceId} event=delivered transport=ws_sync`);
  }
}