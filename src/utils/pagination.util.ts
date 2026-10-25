export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function parsePagination(
  input: PaginationInput,
  defaults: { page: number; limit: number; maxLimit: number },
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, input.page ?? defaults.page);
  const limit = Math.min(defaults.maxLimit, Math.max(1, input.limit ?? defaults.limit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
