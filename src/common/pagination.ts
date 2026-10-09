export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 1 | -1;
}

export interface PaginatedResult<T> {
  docs: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class PaginationUtil {
  public static parse(query: {
    page?: string | number;
    limit?: string | number;
    sortBy?: string;
    sortOrder?: string;
  }, allowedSortFields: string[] = ['createdAt'], defaultSort: string = 'createdAt'): PaginationParams {
    const rawPage = Number(query.page);
    const page = !isNaN(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

    const rawLimit = Number(query.limit);
    // Limit max page size to 100
    const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;

    const skip = (page - 1) * limit;

    let sortBy = defaultSort;
    if (query.sortBy && allowedSortFields.includes(query.sortBy)) {
      sortBy = query.sortBy;
    }

    const sortOrder: 1 | -1 = query.sortOrder?.toLowerCase() === 'asc' ? 1 : -1;

    return {
      page,
      limit,
      skip,
      sortBy,
      sortOrder
    };
  }

  public static format<T>(
    docs: T[],
    total: number,
    params: PaginationParams
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / params.limit) || 1;
    return {
      docs,
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1
    };
  }
}
