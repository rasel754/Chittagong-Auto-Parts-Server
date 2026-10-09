import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../common/errors/unauthorized.error.js';
import { ForbiddenError } from '../common/errors/forbidden.error.js';
import { UserModel } from '../modules/users/user.model.js';
import { CommonStatus } from '../common/constants/status.constant.js';
import { AuthenticatedUser } from '../types/express.js';

interface JwtPayload {
  userId: string;
  phone: string;
  role: string;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Bearer token is missing');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const user = await UserModel.findById(decoded.userId).lean();
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (user.status !== CommonStatus.ACTIVE) {
      throw new ForbiddenError('User account is deactivated. Contact administrator.');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user._id.toString(),
      phone: user.phone,
      name: user.name,
      role: user.role,
      permittedShopIds: (user.permittedShopIds || []).map((id) => id.toString()),
      status: user.status
    };

    req.user = authenticatedUser;
    next();
  } catch (error) {
    next(error);
  }
}
