import jwt from 'jsonwebtoken';
import { UserModel } from '../users/user.model.js';
import { UnauthorizedError } from '../../common/errors/unauthorized.error.js';
import { ForbiddenError } from '../../common/errors/forbidden.error.js';
import { PhoneUtil } from '../../common/utils/phone.util.js';
import { env } from '../../config/env.js';
import { CommonStatus } from '../../common/constants/status.constant.js';
import { LoginInput } from './auth.validation.js';
import { IUserResponse } from '../users/user.interface.js';

export interface AuthResult {
  token: string;
  user: IUserResponse;
}

export class AuthService {
  public static async login(input: LoginInput): Promise<AuthResult> {
    const normalizedPhone = PhoneUtil.normalize(input.phone);

    // Explicitly select passwordHash which is excluded by default
    const user = await UserModel.findOne({ phone: normalizedPhone }).select('+passwordHash');

    if (!user) {
      throw new UnauthorizedError('Invalid phone number or password');
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid phone number or password');
    }

    if (user.status !== CommonStatus.ACTIVE) {
      throw new ForbiddenError('Your account has been deactivated. Please contact administrator.');
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        phone: user.phone,
        role: user.role
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
      }
    );

    const userJson = user.toJSON() as unknown as IUserResponse;

    return {
      token,
      user: userJson
    };
  }

  public static async getMe(userId: string): Promise<IUserResponse> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return user.toJSON() as unknown as IUserResponse;
  }
}
