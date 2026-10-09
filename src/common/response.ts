import { Response } from 'express';

export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: ApiResponseMeta;
  error?: {
    code: string;
    details?: unknown;
  };
}

export class ResponseUtil {
  public static success<T>(
    res: Response,
    message: string = 'Success',
    data?: T,
    statusCode: number = 200,
    meta?: ApiResponseMeta
  ): Response {
    const responseBody: ApiResponse<T> = {
      success: true,
      message,
      ...(data !== undefined && { data }),
      ...(meta !== undefined && { meta })
    };
    return res.status(statusCode).json(responseBody);
  }

  public static created<T>(
    res: Response,
    message: string = 'Created successfully',
    data?: T,
    meta?: ApiResponseMeta
  ): Response {
    return this.success(res, message, data, 201, meta);
  }

  public static error(
    res: Response,
    message: string = 'An error occurred',
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: unknown
  ): Response {
    const responseBody: ApiResponse = {
      success: false,
      message,
      error: {
        code,
        ...(details !== undefined && { details })
      }
    };
    return res.status(statusCode).json(responseBody);
  }
}
