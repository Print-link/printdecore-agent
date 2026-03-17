/** Standard paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** Standard API response */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
