import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { AuthService } from "./auth.service";
import type { RegisterInput } from "./auth.types";
import type { LoginInput } from "./login.types";
import { AuthError, EmailAlreadyInUseError, InvalidInputError, InvalidCredentialsError } from "./auth.errors";


/**
 * Auth routes plugin. Keeps auth HTTP endpoints isolated.
 */


export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
    const authService = new AuthService();

    app.post<{ Body: RegisterInput }>(
    "/register",
        async (request, reply) => {
        
      try {
        const result = await authService.register(request.body);

        // 201 Created is correct for registration
        return reply.code(201).send({
          userId: result.userId,
          deviceId: result.deviceId,
          publicKeyId: result.publicKeyId,
        });
      } catch (err: unknown) {
        // Known, expected errors (control flow)
        if (err instanceof EmailAlreadyInUseError) {
          return reply.code(409).send({
            error: err.code,
            message: err.message,
          });
        }

        if (err instanceof InvalidInputError) {
          return reply.code(400).send({
            error: err.code,
            message: err.message,
          });
          }

          
        if (err instanceof InvalidCredentialsError) {
          return reply.code(400).send({
            error: err.code,
            message: err.message,
          });
        }

        // Other AuthError (future-proof)
        if (err instanceof AuthError) {
          return reply.code(400).send({
            error: err.code,
            message: err.message,
          });
        }

        // Unexpected errors: log + return generic message
        request.log.error({ err }, "Unhandled error in /auth/register");
        return reply.code(500).send({
          error: "INTERNAL_SERVER_ERROR",
          message: "Hey! Something went wrong.",
        });
      }
    }
  );

  app.post<{ Body: LoginInput }>("/login", async (request, reply) => {
    try {
      const { userId } = await authService.validateLogin(request.body);

      const token = await reply.jwtSign({ sub: userId });

      return reply.code(200).send({ token, userId });
    } catch (err: unknown) {
      if (err instanceof InvalidCredentialsError) {
        return reply.code(401).send({ error: err.code, message: err.message });
      }
      if (err instanceof AuthError) {
        return reply.code(400).send({ error: err.code, message: err.message });
      }
      request.log.error({ err }, "Unhandled error in /auth/login");
      return reply.code(500).send({ error: "INTERNAL_SERVER_ERROR", message: "Something went wrong." });
    }
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
    // `request.user` is populated by @fastify/jwt after jwtVerify()
    return {
      userId: request.user.sub,
    };
  }
);


}