import { HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { EMPTY, Observable, finalize } from 'rxjs';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Writes waiting for their response, by `writeKey`. Module-level: one app, one browser tab. */
const inFlight = new Set<string>();

/**
 * Stops a create, update or delete from being sent again while the same one is still waiting for its response (a
 * double click on Save, Enter pressed twice). "The same" means same method, URL with its query, and body; other
 * writes, even to the same endpoint, still go out together (bulk delete, saving an order's lines).
 *
 * The repeat is dropped silently: it completes without a response or an error, so no second toast or navigation;
 * the first request's own handlers finish the job.
 */
export const duplicateWriteInterceptor: HttpInterceptorFn = (req, next) => {
  if (!WRITE_METHODS.has(req.method)) {
    return next(req);
  }
  const key = writeKey(req);
  if (inFlight.has(key)) {
    return EMPTY as Observable<HttpEvent<unknown>>;
  }
  inFlight.add(key);
  return next(req).pipe(finalize(() => inFlight.delete(key)));
};

/** What makes two writes the same request. */
export function writeKey(req: HttpRequest<unknown>): string {
  return `${req.method} ${req.urlWithParams} ${bodyKey(req.body)}`;
}

function bodyKey(body: unknown): string {
  if (body === null || body === undefined) {
    return '';
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const parts: string[] = [];
    body.forEach((value, name) => parts.push(`${name}=${typeof value === 'string' ? value : fileKey(value)}`));
    return `form:${parts.join('&')}`;
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return `blob:${fileKey(body)}`;
  }
  if (typeof body === 'string') {
    return body;
  }
  try {
    return JSON.stringify(body);
  } catch {
    // Not serialisable (circular): never treat two of these as the same request.
    return `unique:${Math.random()}`;
  }
}

function fileKey(file: Blob): string {
  const name = file instanceof File ? `${file.name}:${file.lastModified}` : '';
  return `${name}:${file.size}:${file.type}`;
}
