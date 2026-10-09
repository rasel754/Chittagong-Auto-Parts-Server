import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../common/constants/roles.constant.js';
import { ForbiddenError } from '../common/errors/forbidden.error.js';
import { UnauthorizedError } from '../common/errors/unauthorized.error.js';

export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Requires one of roles: [${roles.join(', ')}]`
        )
      );
    }

    next();
  };
}
