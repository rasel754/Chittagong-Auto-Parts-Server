import { AppError } from './app.error.js';

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT', details?: unknown) {
    super(message, 409, code, details);
  }
}
