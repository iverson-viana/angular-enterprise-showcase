/** Server-side paginated response. `page` is 1-based. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
