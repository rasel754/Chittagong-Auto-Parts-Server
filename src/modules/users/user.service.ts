import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { UserModel } from './user.model.js';
import { PhoneUtil } from '../../common/utils/phone.util.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { PaginationUtil, PaginatedResult } from '../../common/pagination.js';
import { IUserResponse } from './user.interface.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { CommonStatus } from '../../common/constants/status.constant.js';

export interface CreateUserInput {
  name: string;
  phone: string;
  password: string;
  role?: UserRole;
  permittedShopIds?: string[];
  status?: CommonStatus;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  password?: string;
  role?: UserRole;
  permittedShopIds?: string[];
  status?: CommonStatus;
}

export interface ListUsersQuery {
  page?: string;
  limit?: string;
  search?: string;
  role?: UserRole;
  status?: CommonStatus;
  shopId?: string;
}

export class UserService {
  public static async create(input: CreateUserInput): Promise<IUserResponse> {
    const normalizedPhone = PhoneUtil.normalize(input.phone);

    const existing = await UserModel.findOne({ phone: normalizedPhone });
    if (existing) {
      throw new ConflictError(`User with phone number '${normalizedPhone}' already exists`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const permittedShopObjectIds = (input.permittedShopIds || [])
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const user = await UserModel.create({
      name: input.name,
      phone: normalizedPhone,
      passwordHash,
      role: input.role || UserRole.STAFF,
      permittedShopIds: permittedShopObjectIds,
      status: input.status || CommonStatus.ACTIVE
    });

    return user.toJSON() as unknown as IUserResponse;
  }

  public static async findById(id: string): Promise<IUserResponse> {
    const user = await UserModel.findById(id).populate('permittedShopIds', 'name code status');
    if (!user) {
      throw new NotFoundError(`User with ID '${id}' not found`);
    }
    return user.toJSON() as unknown as IUserResponse;
  }

  public static async list(query: ListUsersQuery): Promise<PaginatedResult<IUserResponse>> {
    const pagination = PaginationUtil.parse(query, ['createdAt', 'name', 'phone'], 'createdAt');
    const filter: Record<string, unknown> = {};

    if (query.role) {
      filter.role = query.role;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.shopId && Types.ObjectId.isValid(query.shopId)) {
      filter.permittedShopIds = new Types.ObjectId(query.shopId);
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { phone: searchRegex }];
    }

    const [docs, total] = await Promise.all([
      UserModel.find(filter)
        .populate('permittedShopIds', 'name code status')
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit),
      UserModel.countDocuments(filter)
    ]);

    const formattedDocs = docs.map((doc) => doc.toJSON() as unknown as IUserResponse);
    return PaginationUtil.format(formattedDocs, total, pagination);
  }

  public static async update(id: string, input: UpdateUserInput): Promise<IUserResponse> {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID '${id}' not found`);
    }

    if (input.phone) {
      const normalizedPhone = PhoneUtil.normalize(input.phone);
      if (normalizedPhone !== user.phone) {
        const existing = await UserModel.findOne({ phone: normalizedPhone, _id: { $ne: user._id } });
        if (existing) {
          throw new ConflictError(`Phone number '${normalizedPhone}' is already in use`);
        }
        user.phone = normalizedPhone;
      }
    }

    if (input.name) user.name = input.name;
    if (input.role) user.role = input.role;
    if (input.status) user.status = input.status;

    if (input.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(input.password, salt);
    }

    if (input.permittedShopIds) {
      user.permittedShopIds = input.permittedShopIds
        .filter((sId) => Types.ObjectId.isValid(sId))
        .map((sId) => new Types.ObjectId(sId));
    }

    await user.save();
    return user.toJSON() as unknown as IUserResponse;
  }
}
