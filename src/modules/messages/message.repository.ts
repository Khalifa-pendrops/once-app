import { redis } from "../../redis/client";
import { randomUUID } from "node:crypto";
import type { CreateEncryptedMessageInput, CreateMessageResult, StoredEncryptedMessage } from "./message.types";

const ttlSeconds = Number(process.env.MESSAGE_TTL_SECONDS ?? "600");
if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
  throw new Error("THE MESSAGE_TTL_SECONDS must be a positive number");
}

export class MessageRepository {
  async createEncrypted(input: CreateEncryptedMessageInput): Promise<CreateMessageResult> {
    const messageId = randomUUID();
    const inboxKey = `once:inbox:${input.recipientUserId}`;

    const multi = redis.multi();
    const createdAt = Date.now();

    for (const p of input.payloads) {
      const member = `${messageId}:${p.deviceId}`;
      const msgKey = `once:msg:${member}`;

      const value: StoredEncryptedMessage = {
        recipientUserId: input.recipientUserId,
        recipientDeviceId: p.deviceId,
        nonce: p.nonce,
        ciphertext: p.ciphertext,
        senderPublicKey: p.senderPublicKey,
        createdAt,
      };

      multi.set(msgKey, JSON.stringify(value), { EX: ttlSeconds });
      multi.sAdd(inboxKey, member);
    }

    multi.expire(inboxKey, ttlSeconds);
    await multi.exec();

    return { messageId, expiresInSeconds: ttlSeconds };
  }

  async listPendingForDevice(recipientUserId: string, deviceId: string) {
    const inboxKey = `once:inbox:${recipientUserId}`;
    const members = await redis.sMembers(inboxKey);

    const deviceMembers = members.filter((m) => m.endsWith(`:${deviceId}`));
    if (deviceMembers.length === 0) return [];

    const keys = deviceMembers.map((m) => `once:msg:${m}`);
    const values = await redis.mGet(keys);

    const result: Array<{ messageId: string; nonce: string; ciphertext: string; senderPublicKey: string; createdAt: number }> = [];

    for (let i = 0; i < deviceMembers.length; i++) {
      const raw = values[i];
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as StoredEncryptedMessage;
        const messageId = deviceMembers[i].split(":")[0];

        result.push({
          messageId,
          nonce: parsed.nonce,
          ciphertext: parsed.ciphertext,
          senderPublicKey: parsed.senderPublicKey,
          createdAt: parsed.createdAt,
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

    const messages: Array<{ messageId: string; nonce: string; ciphertext: string; senderPublicKey: string; createdAt: number }> = [];

    for (let i = 0; i < deviceMembers.length; i++) {
      const raw = values[i];
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as StoredEncryptedMessage;
        const messageId = deviceMembers[i].split(":")[0];

        messages.push({
          messageId,
          nonce: parsed.nonce,
          ciphertext: parsed.ciphertext,
          senderPublicKey: parsed.senderPublicKey,
          createdAt: parsed.createdAt,
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
    const key = `msg:${userId}:${deviceId}:${messageId}`;

    const exists = await redis.exists(key);

    if (!exists) {
      console.warn("ACK attempted on non-existent message:", {
        userId,
        deviceId,
        messageId,
      });
      return false;
    }

    await redis.del(key);

    return true;
  }
}