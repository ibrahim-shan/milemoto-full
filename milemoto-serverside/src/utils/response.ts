export interface PaginationPayload<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
}

export type PaginatedResponse<T> = PaginationPayload<T> & {
  totalPages: number;
  total: number;
};

export function buildPaginatedResponse<T, Extra extends object = Record<string, never>>(
  payload: PaginationPayload<T>,
  extra?: Extra
): PaginatedResponse<T> & Extra {
  const { items, totalCount, page, limit } = payload;
  const totalPages = limit > 0 && Number.isFinite(limit) ? Math.ceil(totalCount / limit) : 0;

  return {
    items,
    totalCount,
    total: totalCount,
    page,
    limit,
    totalPages,
    ...(extra ?? ({} as Extra)),
  };
}

export interface DeleteResponse {
  success: boolean;
  action?: 'deleted' | 'deactivated' | string;
  message?: string;
}

export function buildDeleteResponse(
  success = true,
  action?: DeleteResponse['action'],
  message?: string
): DeleteResponse {
  return {
    success,
    ...(action ? { action } : {}),
    ...(message ? { message } : {}),
  };
}
