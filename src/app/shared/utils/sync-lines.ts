import { Observable, concat, defaultIfEmpty, last, map } from 'rxjs';

/** The calls a line resource needs (CrudApi has them all). */
export interface LineApi<P> {
  create(body: P): Observable<unknown>;
  update(id: number, body: Partial<P>): Observable<unknown>;
  remove(id: number): Observable<unknown>;
}

/** A line as the form holds it: `id` is null for a line that doesn't exist yet. */
export interface LineRow<P> {
  id: number | null;
  body: P;
}

/**
 * Saves a document's lines when they are their own resource: deletes the lines the user removed, updates the kept
 * ones and creates the new ones, one request after another so new lines keep the form's order. Emits once, when all
 * are done; stops at the first error (the lines saved before it stay saved).
 */
export function syncLines<P>(api: LineApi<P>, savedIds: readonly number[], rows: readonly LineRow<P>[]): Observable<void> {
  const kept = new Set(rows.map((row) => row.id).filter((id): id is number => id !== null));
  const calls: Observable<unknown>[] = [
    ...savedIds.filter((id) => !kept.has(id)).map((id) => api.remove(id)),
    ...rows.map((row) => (row.id === null ? api.create(row.body) : api.update(row.id, row.body))),
  ];
  return concat(...calls).pipe(
    defaultIfEmpty(null),
    last(),
    map(() => undefined),
  );
}
