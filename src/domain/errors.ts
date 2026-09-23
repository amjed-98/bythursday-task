export type DomainErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NOT_OPEN"
  | "ATTEMPT_CLOSED"
  | "INVALID_ANSWER"
  | "LOCKED"
  | "VALIDATION";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;
