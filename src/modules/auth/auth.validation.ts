import { InvalidInputError } from "./auth.errors";
import type { RegisterInput } from "./auth.types";

/**
 * Minimal validation for V1.
 * We'll later replace/extend this with a zod schema validator
 */

export function validateRegisterInput(input: RegisterInput): void {
  const email = input.email.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    throw new InvalidInputError("A valid email is required of course.");
  }

  if (input.password.length < 8) {
    throw new InvalidInputError("Password must be at least 8 characters definitely.");
  }

  if (!input.deviceName.trim()) {
    throw new InvalidInputError("deviceName is required definitely.");
  }

  if (!input.keyType.trim()) {
    throw new InvalidInputError("keyType is required definitely.");
  }

  if (!input.publicKey.trim()) {
    throw new InvalidInputError("publicKey is required definitely.");
  }
}
