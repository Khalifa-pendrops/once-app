/**
 * Base auth error for predictable control-flow errors.
 * (We don't throw raw strings; we throw typed errors.)
 */


export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class EmailAlreadyInUseError extends AuthError {
  constructor() {
    super("EMAIL_ALREADY_IN_USE", "Hey! This email is already in use.");
  }
}

export class InvalidInputError extends AuthError {
  constructor(message: string) {
    super("INVALID_INPUT", message);
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super("INVALID_CREDENTIALS", "Hey! Invalid credentials. You know which one 🔒.");
  }
}
