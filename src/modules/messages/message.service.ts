import type { CreateMessageInput, CreateMessageResult } from "./message.types";
import { MessageRepository } from "./message.repository";
import { wsManager } from "../ws/ws.manager";


export class MessageService {
  private readonly repo = new MessageRepository();

  // create message
  async createMessage(input: CreateMessageInput): Promise<CreateMessageResult> {
  if (!input.recipientUserId?.trim()) throw new Error("recipientUserId is required");
  if (!input.ciphertext?.trim()) throw new Error("ciphertext is required");

  const recipientId = input.recipientUserId.trim();

  // Store message first (TTL backup)
  const created = await this.repo.create({
    recipientUserId: recipientId,
    ciphertext: input.ciphertext.trim(),
  });

  // If recipient is online, push instantly + delete
  const socket = wsManager.get(recipientId);

  if (socket) {
    socket.send(
      JSON.stringify({
        type: "message",
        messageId: created.messageId,
        ciphertext: input.ciphertext,
      })
    );

    // Delete immediately (ONCE)
    await this.repo.ack(recipientId, created.messageId);
  }

  return created;
}


  // list pending messages
    async listPending(recipientUserId: string): Promise<Array<{ messageId: string; ciphertext: string; createdAt: number }>> {
    if (!recipientUserId?.trim()) throw new Error("recipientUserId is required");
    return this.repo.listPending(recipientUserId.trim());
  }

  // acknowledge message
    async ackMessage(recipientUserId: string, messageId: string): Promise<void> {
    if (!recipientUserId?.trim()) throw new Error("recipientUserId is required");
    if (!messageId?.trim()) throw new Error("messageId is required");

      await this.repo.ack(recipientUserId.trim(), messageId.trim());
      
  }
  async pullPending(recipientUserId: string): Promise<Array<{ messageId: string; ciphertext: string; createdAt: number }>> {
    if (!recipientUserId?.trim()) throw new Error("recipientUserId is required");
    return this.repo.pullPending(recipientUserId.trim());
  }

}
