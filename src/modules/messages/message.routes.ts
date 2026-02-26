import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { MessageService } from "./message.service";
import { requireAuth } from "../auth/auth.guard";
import { requireDevice } from "../devices/device.guard";

type EncryptedPayload = {
  deviceId: string;
  nonce: string; // base64
  ciphertext: string; // base64
  senderPublicKey: string; // base64
  preKeyId?: string; // ✅ new
};

type CreateMessageBody = {
  recipientUserId: string;
  payloads: EncryptedPayload[];
};

export const messageRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const service = new MessageService();

  // ✅ E2EE create message (payloads[])
  app.post<{ Body: CreateMessageBody }>(
    "/messages",
    { preHandler: [requireAuth, requireDevice] },
    async (request, reply) => {
      const { recipientUserId, payloads } = request.body;

      if (!recipientUserId?.trim()) {
        return reply.code(400).send({
          error: "INVALID_INPUT",
          message: "recipientUserId is required",
        });
      }

      if (!Array.isArray(payloads) || payloads.length === 0) {
        return reply.code(400).send({
          error: "INVALID_INPUT",
          message: "payloads is required",
        });
      }

      for (const [i, p] of payloads.entries()) {
        if (!p.deviceId?.trim()) {
          return reply.code(400).send({
            error: "INVALID_INPUT",
            message: `payloads[${i}].deviceId is required`,
          });
        }
        if (!p.nonce?.trim()) {
          return reply.code(400).send({
            error: "INVALID_INPUT",
            message: `payloads[${i}].nonce is required`,
          });
        }
        if (!p.ciphertext?.trim()) {
          return reply.code(400).send({
            error: "INVALID_INPUT",
            message: `payloads[${i}].ciphertext is required`,
          });
        }
        if (!p.senderPublicKey?.trim()) {
          return reply.code(400).send({
            error: "INVALID_INPUT",
            message: `payloads[${i}].senderPublicKey is required`,
          });
        }
      }

      const senderDeviceId = (request as unknown as { deviceId: string }).deviceId;

      const result = await service.createEncryptedMessage({
        senderUserId: request.user.sub,
        senderDeviceId,
        recipientUserId: recipientUserId.trim(),
        payloads: payloads.map((p) => ({
          deviceId: p.deviceId.trim(),
          nonce: p.nonce.trim(),
          ciphertext: p.ciphertext.trim(),
          senderPublicKey: p.senderPublicKey.trim(),
          preKeyId: p.preKeyId?.trim(), // ✅ NEW
        })),
      });

      return reply.code(201).send(result);
    }
  );

  // ✅ List pending messages for THIS device
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

  // ✅ Pull pending messages for THIS device (deliver-once)
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

  // ✅ Ack a specific message for THIS device
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