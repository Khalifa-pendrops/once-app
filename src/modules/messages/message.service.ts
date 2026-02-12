import type { CreateMessageInput, CreateMessageResult } from "./message.types";
import { MessageRepository } from "./message.repository";

export class MessageService {
  private readonly repo = new MessageRepository();

  // create message
  async createMessage(input: CreateMessageInput): Promise<CreateMessageResult> {
    if (!input.recipientUserId?.trim()) {
      throw new Error("the recipientUserId is required");
    }
    if (!input.ciphertext?.trim()) {
      throw new Error("a ciphertext is required");
    }

    return this.repo.create({
      recipientUserId: input.recipientUserId.trim(),
      ciphertext: input.ciphertext.trim(),
    });
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

}
