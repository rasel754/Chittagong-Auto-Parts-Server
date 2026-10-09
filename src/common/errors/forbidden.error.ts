import { AppError } from './app.error.js';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', code: string = 'FORBIDDEN', details?: unknown) {
    super(message, 403, code, details);
  }
}
