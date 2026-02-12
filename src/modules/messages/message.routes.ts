import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { CreateMessageInput } from "./message.types";
import { MessageService } from "./message.service";
import { requireAuth } from "../auth/auth.guard";

export const messageRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const service = new MessageService();

  // app.post<{ Body: CreateMessageInput }>("/messages", async (request, reply) => {
  //   try {
  //     const result = await service.createMessage(request.body);
  //     return reply.code(201).send(result);
  //   } catch (err: unknown) {
  //     request.log.error({ err }, "Sorry, failed to create message");
  //     return reply.code(400).send({
  //       error: "INVALID_INPUT",
  //       message: err instanceof Error ? err.message : "Invalid input",
  //     });
  //   }
  // });

  // create message - only authenticated users can create messages

  app.post<{ Body: CreateMessageInput }>(
  "/messages",
  { preHandler: requireAuth },
  async (request, reply) => {
    // Sender is request.user.sub (we’ll store sender later if needed)
    const result = await service.createMessage(request.body);
    return reply.code(201).send(result);
  }
);


  // app.get<{ Params: { userId: string } }>("/messages/pending/:userId", async (request, reply) => {
  // try {
  //   const result = await service.listPending(request.params.userId);
  //   return reply.code(200).send({ messages: result });
  // } catch (err: unknown) {
  //   request.log.error({ err }, "Sorry, failed to list pending messages");
  //   return reply.code(400).send({
  //     error: "INVALID_INPUT",
  //     message: err instanceof Error ? err.message : "Invalid input",
  //   });
  // }
  // });

  // list pending messages - token based

  app.get(
  "/messages/pending",
  { preHandler: requireAuth },
  async (request, reply) => {
    const userId = request.user.sub;
    const result = await service.listPending(userId);
    return reply.code(200).send({ messages: result });
  }
);
  
//   app.post<{ Params: { messageId: string }; Body: { recipientUserId: string } }>(
//   "/messages/:messageId/ack",
//   async (request, reply) => {
//     try {
//       await service.ackMessage(request.body.recipientUserId, request.params.messageId);
//       return reply.code(200).send({ status: "acknowledged" });
//     } catch (err: unknown) {
//       request.log.error({ err }, "Failed to ack message");
//       return reply.code(400).send({
//         error: "INVALID_INPUT",
//         message: err instanceof Error ? err.message : "Invalid input",
//       });
//     }
//   }
  // );
  
  // acknowledge message - token based
  app.post<{ Params: { messageId: string } }>(
  "/messages/:messageId/ack",
  { preHandler: requireAuth },
  async (request, reply) => {
    const userId = request.user.sub;
    await service.ackMessage(userId, request.params.messageId);
    return reply.code(200).send({ status: "acknowledged" });
  }
);

};
