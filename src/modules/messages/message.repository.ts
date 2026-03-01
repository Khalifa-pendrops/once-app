import { redis } from "../../redis/client";
import { randomUUID } from "node:crypto";
import type { CreateEncryptedMessageInput, CreateMessageResult, StoredEncryptedMessage } from "./message.types";

const ttlSeconds = Number(process.env.MESSAGE_TTL_SECONDS ?? "600");
if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
  throw new Error("THE MESSAGE_TTL_SECONDS must be a positive number");
}

export class MessageRepository {
  async createEncrypted(input: CreateEncryptedMessageInput): Promise<CreateMessageResult> {
    const { senderUserId, senderDeviceId, clientMessageId } = input;
    
    // 1. Idempotency Check
    if (clientMessageId) {
      const idempotencyKey = `once:idempotency:${senderUserId}:${senderDeviceId}:${clientMessageId}`;
      const existingId = await redis.get(idempotencyKey);
      if (existingId) {
        // Fetch any one payload to get original timestamps
        const members = await redis.sMembers(`once:inbox:${input.recipientUserId}`);
        const member = members.find(m => m.startsWith(`${existingId}:`));
        if (member) {
          const raw = await redis.get(`once:msg:${member}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            return {
              messageId: existingId,
              expiresInSeconds: ttlSeconds,
              createdAt: parsed.createdAt,
              expiresAt: parsed.expiresAt
            };
          }
        }
        return { messageId: existingId, expiresInSeconds: ttlSeconds, createdAt: Date.now(), expiresAt: Date.now() + ttlSeconds * 1000 };
      }
    }

    const messageId = randomUUID();
    const inboxKey = `once:inbox:${input.recipientUserId}`;
    const multi = redis.multi();
    const createdAt = Date.now();
    const expiresAt = createdAt + ttlSeconds * 1000;

    for (const p of input.payloads) {
      const member = `${messageId}:${p.deviceId}`;
      const msgKey = `once:msg:${member}`;

      const value: StoredEncryptedMessage = {
        senderUserId,
        senderDeviceId,
        recipientUserId: input.recipientUserId,
        recipientDeviceId: p.deviceId,
        nonce: p.nonce,
        ciphertext: p.ciphertext,
        senderPublicKey: p.senderPublicKey,
        preKeyId: p.preKeyId,
        createdAt,
        expiresAt, // ✅ explicit expiry
      };

      multi.set(msgKey, JSON.stringify(value), { EX: ttlSeconds });
      multi.sAdd(inboxKey, member);
    }

    // Store idempotency mapping
    if (clientMessageId) {
      const idempotencyKey = `once:idempotency:${senderUserId}:${senderDeviceId}:${clientMessageId}`;
      multi.set(idempotencyKey, messageId, { EX: ttlSeconds });
    }

    multi.expire(inboxKey, ttlSeconds);
    await multi.exec();

    return { messageId, expiresInSeconds: ttlSeconds, createdAt, expiresAt };
  }

  /**
   * Updates the deliveredAt timestamp for a message.
   */
  async markDelivered(userId: string, deviceId: string, messageId: string) {
    const msgKey = `once:msg:${messageId}:${deviceId}`;
    const raw = await redis.get(msgKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as StoredEncryptedMessage;
      if (parsed.deliveredAt) return; // already marked

      parsed.deliveredAt = Date.now();
      await redis.set(msgKey, JSON.stringify(parsed), { KEEPTTL: true });
    } catch {
      // ignore
    }
  }

  async listPendingForDevice(recipientUserId: string, deviceId: string) {
    const inboxKey = `once:inbox:${recipientUserId}`;
    const members = await redis.sMembers(inboxKey);

    const deviceMembers = members.filter((m) => m.endsWith(`:${deviceId}`));
    if (deviceMembers.length === 0) return [];

    const keys = deviceMembers.map((m) => `once:msg:${m}`);
    const values = await redis.mGet(keys);

    const result: Array<any> = [];

    for (let i = 0; i < deviceMembers.length; i++) {
      const raw = values[i];
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as StoredEncryptedMessage;
        const messageId = deviceMembers[i].split(":")[0];

        // Strict Expiry Check (Safety)
        if (parsed.expiresAt < Date.now()) {
          console.log(`[MESSAGE_EXPIRED] id=${messageId} device=${deviceId}`);
          continue;
        }

        result.push({
          messageId,
          ...parsed
        });
      } catch {
        // ignore malformed
      }
    }

    return result;
  }

  async pullPendingForDevice(recipientUserId: string, deviceId: string) {
    const inboxKey = `once:inbox:${recipientUserId}`;
    const members = await redis.sMembers(inboxKey);

    const deviceMembers = members.filter((m) => m.endsWith(`:${deviceId}`));
    if (deviceMembers.length === 0) return [];

    const keys = deviceMembers.map((m) => `once:msg:${m}`);
    const values = await redis.mGet(keys);

    const messages: Array<any> = [];

    for (let i = 0; i < deviceMembers.length; i++) {
      const raw = values[i];
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as StoredEncryptedMessage;
        const messageId = deviceMembers[i].split(":")[0];
        
        // Strict Expiry Check
        if (parsed.expiresAt < Date.now()) {
          console.log(`[MESSAGE_EXPIRED] id=${messageId} device=${deviceId}`);
          continue;
        }

        messages.push({
          messageId,
          ...parsed
        });
      } catch {
        // ignore malformed
      }
    }

    const multi = redis.multi();
    multi.del(keys);
    multi.sRem(inboxKey, deviceMembers);
    await multi.exec();

    return messages;
  }

  async ackForDevice(userId: string, deviceId: string, messageId: string) {
    const inboxKey = `once:inbox:${userId}`;
    const member = `${messageId}:${deviceId}`;
    const msgKey = `once:msg:${member}`;

    // ✅ Idempotent ACK: Success if message is already gone
    const exists = await redis.exists(msgKey);
    if (!exists) return true;

    const multi = redis.multi();
    multi.del(msgKey);
    multi.sRem(inboxKey, member);
    await multi.exec();

    return true;
  }
}