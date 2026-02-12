import { prisma } from "../../database/prisma";
import { hashPassword, verifyPassword } from "./password"; 
import { validateRegisterInput } from "./auth.validation";
import type { RegisterInput, RegisterResult } from "./auth.types";
import type { LoginInput, LoginResult } from "./login.types";
import {
  EmailAlreadyInUseError,
  InvalidCredentialsError,
} from "./auth.errors";


/**
 * AuthService contains business rules for authentication/registration.
 * It should not know about HTTP details - for this project it is Fastify request/response
 */

export class AuthService {
      /**
   * Register a new user + device + public key.
   *
   * Security properties:
   * - Password is hashed (Argon2id)
   * - User uniqueness enforced via lookup + DB unique constraint
   * - User/device/key are created atomically (transaction)
   */
    
    async register(input: RegisterInput): Promise<RegisterResult> {
        validateRegisterInput(input);

        const email = input.email.trim().toLowerCase()

        // hash before transaction to minimize time holding db transaction
        const passwordHash = await hashPassword(input.password);

        // see if user exists
        const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
        if (existingUser) {
            throw new EmailAlreadyInUseError();
        }

        

    // Atomic creation: user -> device -> public key
        const result = await prisma.$transaction(async (tx) => {
        
      const user = await tx.user.create({
        data: { email, passwordHash },
      });

      const device = await tx.device.create({
        data: {
          userId: user.id,
          deviceName: input.deviceName.trim(),
        },
      });

      const key = await tx.publicKey.create({
        data: {
          deviceId: device.id,
          keyType: input.keyType.trim(),
          publicKey: input.publicKey.trim(),
        },
      });

      return {
        userId: user.id,
        deviceId: device.id,
        publicKeyId: key.id,
      } satisfies RegisterResult;
        });
        
 //Why we used prisma.$transaction directly (for now)

 // built repositories, but Prisma transactions require either:

 // passing a transaction client into each repository method, or

 // calling tx.* directly inside the transaction callback.

 // For correctness + simplicity, we use tx.* here first.

 // Next we can refactor repositories to accept tx cleanly

    return result;
    }
  
   /**
   * Login using email + password.
   * Token signing happens in the route layer (because it needs Fastify jwt).
   * Here we just validate credentials and return userId.
   */
  async validateLogin(input: LoginInput): Promise<{ userId: string }> {
    const email = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new InvalidCredentialsError();

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw new InvalidCredentialsError();

    return { userId: user.id };
  }
}