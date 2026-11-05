/**
 * A business rule rejected the input (weak password, malformed e-mail...).
 * Framework-free on purpose: the HTTP layer maps it to a 400, the domain never
 * needs to know about status codes.
 */
export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}
