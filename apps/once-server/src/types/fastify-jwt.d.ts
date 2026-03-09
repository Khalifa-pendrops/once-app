import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    // what we sign into the token
    payload: { sub: string };

    // what request.user becomes after jwtVerify()
    user: { sub: string };
  }
}
