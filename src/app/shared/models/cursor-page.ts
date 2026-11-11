/**
 * Cursor-paginated response, for append-only feeds (infinite scroll).
 * Unlike offsets, a cursor stays correct when new records arrive between requests.
 */
export interface CursorPage<T> {
  items: T[];
  /** Opaque — pass back as `cursor` to get the next slice; `null` when there is no more. */
  nextCursor: string | null;
  /** Total matching records (for "N of M" and `aria-rowcount`). */
  total: number;
}
