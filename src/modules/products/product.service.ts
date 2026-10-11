import { ProductModel } from './product.model.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { PaginationUtil, PaginatedResult } from '../../common/pagination.js';
import { RegexUtil } from '../../common/utils/regex.util.js';
import { IProductResponse } from './product.interface.js';

export interface CreateProductInput {
  name: string;
  sku?: string;
  description?: string;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  description?: string;
}

export interface ListProductsQuery {
  page?: string;
  limit?: string;
  search?: string;
  sku?: string;
  all?: 'true' | 'false';
}

export class ProductService {
  public static async create(input: CreateProductInput): Promise<IProductResponse> {
    const trimmedName = input.name.trim();
    const normalizedName = trimmedName.toLowerCase();

    if (input.sku) {
      const existingSku = await ProductModel.findOne({ sku: input.sku.trim() });
      if (existingSku) {
        throw new ConflictError(`Product with SKU '${input.sku.trim()}' already exists`);
      }
    }

    // Check if duplicate product exists by exact name match
    const existingName = await ProductModel.findOne({ normalizedName });
    if (existingName) {
      return existingName.toJSON() as IProductResponse;
    }

    const product = await ProductModel.create({
      name: trimmedName,
      normalizedName,
      sku: input.sku?.trim() || undefined,
      description: input.description?.trim()
    });

    return product.toJSON() as IProductResponse;
  }

  public static async findById(id: string): Promise<IProductResponse> {
    const product = await ProductModel.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }
    return product.toJSON() as IProductResponse;
  }

  public static async list(query: ListProductsQuery): Promise<PaginatedResult<IProductResponse>> {
    const isFetchAll = query.all === 'true' || query.limit === 'all';
    const pagination = PaginationUtil.parse(query, ['createdAt', 'name', 'normalizedName', 'sku'], 'name', 5000);
    const filter: Record<string, unknown> = {};

    if (query.sku) {
      filter.sku = query.sku.trim();
    }

    if (query.search) {
      const searchRegex = RegexUtil.createCaseInsensitiveSearchRegex(query.search);
      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { description: searchRegex }
      ];
    }

    const productQuery = ProductModel.find(filter)
      .sort({ [pagination.sortBy]: pagination.sortOrder });

    if (!isFetchAll) {
      productQuery.skip(pagination.skip).limit(pagination.limit);
    }

    const [docs, total] = await Promise.all([
      productQuery,
      ProductModel.countDocuments(filter)
    ]);

    const formattedDocs = docs.map((doc) => doc.toJSON() as IProductResponse);
    if (isFetchAll) {
      return {
        docs: formattedDocs,
        total,
        page: 1,
        limit: total || 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      };
    }
    return PaginationUtil.format(formattedDocs, total, pagination);
  }

  public static async update(id: string, input: UpdateProductInput): Promise<IProductResponse> {
    const product = await ProductModel.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    if (input.sku) {
      const trimmedSku = input.sku.trim();
      if (trimmedSku !== product.sku) {
        const existing = await ProductModel.findOne({ sku: trimmedSku, _id: { $ne: product._id } });
        if (existing) {
          throw new ConflictError(`Product with SKU '${trimmedSku}' already exists`);
        }
        product.sku = trimmedSku;
      }
    }

    if (input.name) {
      product.name = input.name.trim();
      product.normalizedName = input.name.trim().toLowerCase();
    }

    if (input.description !== undefined) {
      product.description = input.description.trim();
    }

    await product.save();
    return product.toJSON() as IProductResponse;
  }
}
