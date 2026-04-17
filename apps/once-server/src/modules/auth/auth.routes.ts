import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { AuthService } from "./auth.service";
import type { RegisterInput } from "./auth.types";
import type { LoginInput } from "./login.types";
import { AuthError, EmailAlreadyInUseError, InvalidInputError, InvalidCredentialsError } from "./auth.errors";


import { recordServerErrorEvent } from "../debug/debugEvent.service";


/**
 * Auth routes plugin. Keeps auth HTTP endpoints isolated.
 */


export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const authService = new AuthService();

  app.post<{ Body: RegisterInput }>("/register", async (request, reply) => {
    const result = await authService.register(request.body);
    return reply.code(201).send({
      userId: result.userId,
      deviceId: result.deviceId,
      publicKeyId: result.publicKeyId,
    });
  });

  app.post<{ Body: LoginInput }>("/login", async (request, reply) => {
    const { userId } = await authService.validateLogin(request.body);
    const token = await reply.jwtSign({ sub: userId });
    return reply.code(200).send({ token, userId });
  });

  app.get(
    "/me",
    {
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.code(401).send({
            error: "UNAUTHORIZED",
            message: "Missing or invalid token.",
          });
        }
      },
    },
    async (request) => {
      return {
        userId: request.user.sub,
      };
    }
  );
};


}