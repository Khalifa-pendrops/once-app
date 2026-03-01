import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { MessageService } from "./message.service";
import { requireAuth } from "../auth/auth.guard";
import { requireDevice } from "../devices/device.guard";

type EncryptedPayload = {
  deviceId: string;
  nonce: string; // base64
  ciphertext: string; // base64
  senderPublicKey: string; // base64
  preKeyId?: string; 
};

type CreateMessageBody = {
  recipientUserId: string;
  clientMessageId?: string; // for idempotency
  payloads: EncryptedPayload[];
};

const createMessageSchema = {
  body: {
    type: "object",
    required: ["recipientUserId", "payloads"],
    properties: {
      recipientUserId: { type: "string" },
      clientMessageId: { type: "string" },
      payloads: {
        type: "array",
        minItems: 1,
        maxItems: 20, // Reject huge fanouts
        items: {
          type: "object",
          required: ["deviceId", "nonce", "ciphertext", "senderPublicKey"],
          properties: {
            deviceId: { type: "string" },
            nonce: { type: "string", maxLength: 100 },
            ciphertext: { type: "string", maxLength: 65536 }, // 64KB max for E2EE payload
            senderPublicKey: { type: "string", maxLength: 256 },
            preKeyId: { type: "string" },
          },
        },
      },
    },
  },
};

export const messageRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const service = new MessageService();

  // E2EE create message (payloads[])
  app.post<{ Body: CreateMessageBody }>(
    "/messages",
    {
      preHandler: [requireAuth, requireDevice],
      schema: createMessageSchema,
      config: {
        rateLimit: {
          max: 30, // 30 messages per minute per sender device
          timeWindow: "1 minute",
          keyGenerator: (request: any) => request.deviceId || request.ip,
        },
      },
    },
    async (request, reply) => {
      const { recipientUserId, payloads, clientMessageId } = request.body;

      const senderDeviceId = (request as unknown as { deviceId: string }).deviceId;

      const result = await service.createEncryptedMessage({
        senderUserId: request.user.sub,
        senderDeviceId,
        recipientUserId: recipientUserId.trim(),
        clientMessageId: clientMessageId?.trim(),
        payloads: payloads.map((p) => ({
          deviceId: p.deviceId.trim(),
          nonce: p.nonce.trim(),
          ciphertext: p.ciphertext.trim(),
          senderPublicKey: p.senderPublicKey.trim(),
          preKeyId: p.preKeyId?.trim(),
        })),
      });

      return reply.code(201).send(result);
    }
  );

  // List pending messages for THIS device
  app.get(
    "/messages/pending",
    { preHandler: [requireAuth, requireDevice] },
    async (request, reply) => {
      const userId = request.user.sub;
      const deviceId = (request as unknown as { deviceId: string }).deviceId;

      const result = await service.listPendingForDevice(userId, deviceId);
      return reply.code(200).send({ messages: result });
    }
  );

  //  Pull pending messages for THIS device (deliver-once)
  app.post(
    "/messages/pull",
    { preHandler: [requireAuth, requireDevice] },
    async (request, reply) => {
      const userId = request.user.sub;
      const deviceId = (request as unknown as { deviceId: string }).deviceId;

      const messages = await service.pullPendingForDevice(userId, deviceId);
      return reply.code(200).send({ messages });
    }
  );

  //  Ack a specific message for THIS device
  app.post<{ Params: { messageId: string } }>(
    "/messages/:messageId/ack",
    { preHandler: [requireAuth, requireDevice] },
    async (request, reply) => {
      const userId = request.user.sub;
      const deviceId = (request as unknown as { deviceId: string }).deviceId;

      await service.ackMessageForDevice(userId, deviceId, request.params.messageId);
      return reply.code(200).send({ status: "acknowledged" });
    }
  );
};