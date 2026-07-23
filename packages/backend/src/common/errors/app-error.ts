export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} not found`, { entity, id });
  }
}

export class ValidationError extends AppError {
  constructor(issues: unknown[]) {
    super('VALIDATION_ERROR', 'Validation failed', { issues });
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message);
  }
}
