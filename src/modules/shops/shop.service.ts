import { Types } from 'mongoose';
import { ShopModel } from './shop.model.js';
import { SlugUtil } from '../../common/utils/slug.util.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { ForbiddenError } from '../../common/errors/forbidden.error.js';
import { PaginationUtil, PaginatedResult } from '../../common/pagination.js';
import { IShopResponse } from './shop.interface.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { CommonStatus } from '../../common/constants/status.constant.js';
import { AuthenticatedUser } from '../../types/express.js';

export interface CreateShopInput {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  status?: CommonStatus;
}

export interface UpdateShopInput {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  status?: CommonStatus;
}

export interface ListShopsQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: CommonStatus;
}

export class ShopService {
  public static async create(input: CreateShopInput): Promise<IShopResponse> {
    const rawCode = input.code || input.name;
    const normalizedCode = SlugUtil.create(rawCode);

    const existing = await ShopModel.findOne({ code: normalizedCode });
    if (existing) {
      throw new ConflictError(`Shop with code '${normalizedCode}' already exists`);
    }

    const shop = await ShopModel.create({
      name: input.name.trim(),
      code: normalizedCode,
      address: input.address?.trim(),
      phone: input.phone?.trim(),
      status: input.status || CommonStatus.ACTIVE
    });

    return shop.toJSON() as IShopResponse;
  }

  public static async list(
    user: AuthenticatedUser,
    query: ListShopsQuery
  ): Promise<PaginatedResult<IShopResponse>> {
    const pagination = PaginationUtil.parse(query, ['createdAt', 'name', 'code'], 'name');
    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { code: searchRegex }];
    }

    // Role-based data isolation: non-admins only see shops they are permitted to access
    if (user.role !== UserRole.ADMIN) {
      const permittedObjectIds = user.permittedShopIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      filter._id = { $in: permittedObjectIds };
    }

    const [docs, total] = await Promise.all([
      ShopModel.find(filter)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit),
      ShopModel.countDocuments(filter)
    ]);

    const formattedDocs = docs.map((doc) => doc.toJSON() as IShopResponse);
    return PaginationUtil.format(formattedDocs, total, pagination);
  }

  public static async getByIdOrCode(
    shopIdOrCode: string,
    user: AuthenticatedUser
  ): Promise<IShopResponse> {
    let shop = null;
    if (Types.ObjectId.isValid(shopIdOrCode)) {
      shop = await ShopModel.findById(shopIdOrCode);
    } else {
      shop = await ShopModel.findOne({ code: shopIdOrCode.toLowerCase() });
    }

    if (!shop) {
      throw new NotFoundError(`Shop '${shopIdOrCode}' not found`);
    }

    if (user.role !== UserRole.ADMIN) {
      const hasAccess = user.permittedShopIds.includes(shop._id.toString());
      if (!hasAccess) {
        throw new ForbiddenError(`You do not have access to view shop '${shop.name}'`);
      }
    }

    return shop.toJSON() as IShopResponse;
  }

  public static async update(
    shopIdOrCode: string,
    input: UpdateShopInput
  ): Promise<IShopResponse> {
    let shop = null;
    if (Types.ObjectId.isValid(shopIdOrCode)) {
      shop = await ShopModel.findById(shopIdOrCode);
    } else {
      shop = await ShopModel.findOne({ code: shopIdOrCode.toLowerCase() });
    }

    if (!shop) {
      throw new NotFoundError(`Shop '${shopIdOrCode}' not found`);
    }

    if (input.code) {
      const normalizedCode = SlugUtil.create(input.code);
      if (normalizedCode !== shop.code) {
        const existing = await ShopModel.findOne({
          code: normalizedCode,
          _id: { $ne: shop._id }
        });
        if (existing) {
          throw new ConflictError(`Shop with code '${normalizedCode}' already exists`);
        }
        shop.code = normalizedCode;
      }
    }

    if (input.name) shop.name = input.name.trim();
    if (input.address !== undefined) shop.address = input.address.trim();
    if (input.phone !== undefined) shop.phone = input.phone.trim();
    if (input.status) shop.status = input.status;

    await shop.save();
    return shop.toJSON() as IShopResponse;
  }

  public static async updateStatus(
    shopIdOrCode: string,
    status: CommonStatus
  ): Promise<IShopResponse> {
    return this.update(shopIdOrCode, { status });
  }
}
