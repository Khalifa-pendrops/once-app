import argon2 from "argon2";


/**
 * Hash a plaintext password using Argon2id.
 * - Argon2id is recommended for password hashing.
 * - We keep configuration explicit for clarity.
 */


export async function hashPassword (plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    // Reasonable defaults for a server; can be tuned later.
    memoryCost: 19456, // KiB (~19MB)
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
}
