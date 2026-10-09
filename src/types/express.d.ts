import { UserRole } from '../common/constants/roles.constant.js';
import { CommonStatus } from '../common/constants/status.constant.js';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  permittedShopIds: string[];
  status: CommonStatus;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
