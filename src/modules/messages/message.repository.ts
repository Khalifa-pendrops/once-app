import { redis } from "../../redis/client";
import { randomUUID } from "node:crypto";
import type { CreateMessageInput, CreateMessageResult } from "./message.types";

const ttlSeconds = Number(process.env.MESSAGE_TTL_SECONDS ?? "600");
if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
  throw new Error("THE MESSAGE_TTL_SECONDS must be a positive number");
}

export type StoredMessage = Readonly<{
  recipientUserId: string;
  ciphertext: string;
  createdAt: number;
}>;

/**
 * Messages are stored in Redis only.
 * Key format: once:msg:<messageId>
 */
export class MessageRepository {
  async create(input: CreateMessageInput): Promise<CreateMessageResult> {
    const messageId = randomUUID();

    const msgKey = `once:msg:${messageId}`;
    const inboxKey = `once:inbox:${input.recipientUserId}`;

    const value: StoredMessage = {
      recipientUserId: input.recipientUserId,
      ciphertext: input.ciphertext,
      createdAt: Date.now(),
    };

    // Use MULTI to keep operations grouped.
    await redis
      .multi()
      .set(msgKey, JSON.stringify(value), { EX: ttlSeconds })
      .sAdd(inboxKey, messageId)
      .expire(inboxKey, ttlSeconds)
      .exec();

    return { messageId, expiresInSeconds: ttlSeconds };
  }

  /**
   * Get all pending messages for a recipient.
   */

  async listPending(recipientUserId: string): Promise<Array<{ messageId: string; ciphertext: string; createdAt: number }>> {
    const inboxKey = `once:inbox:${recipientUserId}`;

    const messageIds = await redis.sMembers(inboxKey);
    if (messageIds.length === 0) return [];

    // Fetch each message payload
    const keys = messageIds.map((id) => `once:msg:${id}`);
    const values = await redis.mGet(keys);

    const result: Array<{ messageId: string; ciphertext: string; createdAt: number }> = [];

    for (let i = 0; i < messageIds.length; i++) {
      const raw = values[i];
      if (!raw) continue; // expired/missing
      try {
        const parsed = JSON.parse(raw) as StoredMessage;
        result.push({
          messageId: messageIds[i],
          ciphertext: parsed.ciphertext,
          createdAt: parsed.createdAt,
        });
      } catch {
        // ignore malformed messages
      }
    }

    return result;
  }

  /**
   * Acknowledge (confirm delivery) of a message.
   * Deletes the message and removes it from recipient inbox.
   * Idempotent: OK even if message already expired.
   */
  async ack(recipientUserId: string, messageId: string): Promise<void> {
    const msgKey = `once:msg:${messageId}`;
    const inboxKey = `once:inbox:${recipientUserId}`;

    await redis
      .multi()
      .del(msgKey)
      .sRem(inboxKey, messageId)
      .exec();
  }
}
