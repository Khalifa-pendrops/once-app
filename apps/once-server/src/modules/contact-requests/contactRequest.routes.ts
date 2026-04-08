import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { prisma } from "../../database/prisma";
import { requireAuth } from "../auth/auth.guard";
import { wsManager } from "../ws/ws.manager";

type CreateContactRequestBody = {
  recipientUserId: string;
};

export const contactRequestRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: CreateContactRequestBody }>(
    "/contact-requests",
    { preHandler: requireAuth },
    async (request, reply) => {
      const requesterUserId = request.user.sub;
      const recipientUserId = request.body.recipientUserId?.trim();

      if (!recipientUserId) {
        return reply.code(400).send({
          error: "INVALID_INPUT",
          message: "recipientUserId is required.",
        });
      }

      if (requesterUserId === recipientUserId) {
        return reply.code(400).send({
          error: "INVALID_INPUT",
          message: "You cannot create a contact request for yourself.",
        });
      }

      const [requester, recipient] = await Promise.all([
        prisma.user.findUnique({
          where: { id: requesterUserId },
          select: { id: true, email: true },
        }),
        prisma.user.findUnique({
          where: { id: recipientUserId },
          select: { id: true, email: true },
        }),
      ]);

      if (!requester || !recipient) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: "Requester or recipient user could not be found.",
        });
      }

      const existingReverse = await prisma.contactRequest.findUnique({
        where: {
          requesterUserId_recipientUserId: {
            requesterUserId: recipientUserId,
            recipientUserId: requesterUserId,
          },
        },
        include: {
          requester: { select: { id: true, email: true } },
          recipient: { select: { id: true, email: true } },
        },
      });

      if (existingReverse && existingReverse.status !== "IGNORED") {
        const respondedAt = existingReverse.respondedAt ?? new Date();
        const acceptedReverse = existingReverse.status === "PENDING"
          ? await prisma.contactRequest.update({
              where: { id: existingReverse.id },
              data: {
                status: "ACCEPTED",
                respondedAt,
              },
              include: {
                requester: { select: { id: true, email: true } },
                recipient: { select: { id: true, email: true } },
              },
            })
          : existingReverse;

        const acceptedForward = await prisma.contactRequest.upsert({
          where: {
            requesterUserId_recipientUserId: {
              requesterUserId,
              recipientUserId,
            },
          },
          update: {
            status: "ACCEPTED",
            respondedAt,
          },
          create: {
            requesterUserId,
            recipientUserId,
            status: "ACCEPTED",
            respondedAt,
          },
          include: {
            requester: { select: { id: true, email: true } },
            recipient: { select: { id: true, email: true } },
          },
        });

        if (existingReverse.status === "PENDING") {
          for (const socket of wsManager.getUserSockets(recipientUserId)) {
            socket.send(
              JSON.stringify({
                type: "contact_request_accepted",
                request: {
                  id: acceptedReverse.id,
                  requesterUserId: acceptedReverse.requester.id,
                  requesterEmail: acceptedReverse.requester.email,
                  recipientUserId: acceptedReverse.recipient.id,
                  recipientEmail: acceptedReverse.recipient.email,
                  status: acceptedReverse.status.toLowerCase(),
                  createdAt: acceptedReverse.createdAt,
                  respondedAt: acceptedReverse.respondedAt,
                },
              })
            );
          }
        }

        return reply.code(200).send({
          id: acceptedForward.id,
          requesterUserId: acceptedForward.requester.id,
          requesterEmail: acceptedForward.requester.email,
          recipientUserId: acceptedForward.recipient.id,
          recipientEmail: acceptedForward.recipient.email,
          status: acceptedForward.status.toLowerCase(),
          createdAt: acceptedForward.createdAt,
          respondedAt: acceptedForward.respondedAt,
        });
      }

      const created = await prisma.contactRequest.upsert({
        where: {
          requesterUserId_recipientUserId: {
            requesterUserId,
            recipientUserId,
          },
        },
        update: {
          status: "PENDING",
          respondedAt: null,
        },
        create: {
          requesterUserId,
          recipientUserId,
          status: "PENDING",
        },
        include: {
          requester: { select: { id: true, email: true } },
          recipient: { select: { id: true, email: true } },
        },
      });

      for (const socket of wsManager.getUserSockets(recipientUserId)) {
        socket.send(
          JSON.stringify({
            type: "contact_request",
            request: {
              id: created.id,
              requesterUserId: created.requester.id,
              requesterEmail: created.requester.email,
              recipientUserId: created.recipient.id,
              recipientEmail: created.recipient.email,
              status: created.status.toLowerCase(),
              createdAt: created.createdAt,
              respondedAt: created.respondedAt,
            },
          })
        );
      }

      return reply.code(201).send({
        id: created.id,
        requesterUserId: created.requester.id,
        requesterEmail: created.requester.email,
        recipientUserId: created.recipient.id,
        recipientEmail: created.recipient.email,
        status: created.status.toLowerCase(),
        createdAt: created.createdAt,
        respondedAt: created.respondedAt,
      });
    }
  );

  app.get(
    "/contact-requests/incoming",
    { preHandler: requireAuth },
    async (request, reply) => {
      const recipientUserId = request.user.sub;

      const requests = await prisma.contactRequest.findMany({
        where: {
          recipientUserId,
          status: "PENDING",
        },
        include: {
          requester: { select: { id: true, email: true } },
          recipient: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        requests: requests.map((contactRequest) => ({
          id: contactRequest.id,
          requesterUserId: contactRequest.requester.id,
          requesterEmail: contactRequest.requester.email,
          recipientUserId: contactRequest.recipient.id,
          recipientEmail: contactRequest.recipient.email,
          status: contactRequest.status.toLowerCase(),
          createdAt: contactRequest.createdAt,
          respondedAt: contactRequest.respondedAt,
        })),
      });
    }
  );

  app.get(
    "/contact-requests/outgoing",
    { preHandler: requireAuth },
    async (request, reply) => {
      const requesterUserId = request.user.sub;

      const requests = await prisma.contactRequest.findMany({
        where: {
          requesterUserId,
        },
        include: {
          requester: { select: { id: true, email: true } },
          recipient: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        requests: requests.map((contactRequest) => ({
          id: contactRequest.id,
          requesterUserId: contactRequest.requester.id,
          requesterEmail: contactRequest.requester.email,
          recipientUserId: contactRequest.recipient.id,
          recipientEmail: contactRequest.recipient.email,
          status: contactRequest.status.toLowerCase(),
          createdAt: contactRequest.createdAt,
          respondedAt: contactRequest.respondedAt,
        })),
      });
    }
  );

  app.post<{ Params: { requestId: string } }>(
    "/contact-requests/:requestId/accept",
    { preHandler: requireAuth },
    async (request, reply) => {
      const recipientUserId = request.user.sub;
      const requestId = request.params.requestId?.trim();

      if (!requestId) {
        return reply.code(400).send({
          error: "INVALID_INPUT",
          message: "requestId is required.",
        });
      }

      const existing = await prisma.contactRequest.findUnique({
        where: { id: requestId },
        include: {
          requester: { select: { id: true, email: true } },
          recipient: { select: { id: true, email: true } },
        },
      });

      if (!existing || existing.recipientUserId !== recipientUserId) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: "Contact request not found.",
        });
      }

      const accepted = await prisma.contactRequest.update({
        where: { id: requestId },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
        include: {
          requester: { select: { id: true, email: true } },
          recipient: { select: { id: true, email: true } },
        },
      });

      for (const socket of wsManager.getUserSockets(accepted.requester.id)) {
        socket.send(
          JSON.stringify({
            type: "contact_request_accepted",
            request: {
              id: accepted.id,
              requesterUserId: accepted.requester.id,
              requesterEmail: accepted.requester.email,
              recipientUserId: accepted.recipient.id,
              recipientEmail: accepted.recipient.email,
              status: accepted.status.toLowerCase(),
              createdAt: accepted.createdAt,
              respondedAt: accepted.respondedAt,
            },
          })
        );
      }

      return reply.send({
        id: accepted.id,
        requesterUserId: accepted.requester.id,
        requesterEmail: accepted.requester.email,
        recipientUserId: accepted.recipient.id,
        recipientEmail: accepted.recipient.email,
        status: accepted.status.toLowerCase(),
        createdAt: accepted.createdAt,
        respondedAt: accepted.respondedAt,
      });
    }
  );
};
