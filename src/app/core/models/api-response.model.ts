export interface ApiMeta {
  timestamp: string;
  version: string;
  total_count?: number;
}

export interface ApiError {
  code: number;
  message: string;
  errors: Record<string, string[]>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  metadata?: ApiMeta;
  error?: ApiError;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  metadata?: ApiMeta;
  error: ApiError;
}

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
