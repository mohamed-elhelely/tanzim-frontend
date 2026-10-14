import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { errorEnvelope } from '../../testing/api-testing';
import { toAppError } from './app-error';

describe('toAppError', () => {
  function fromBody(message: string) {
    return toAppError(new HttpErrorResponse({ status: 400, error: errorEnvelope(400, message) }));
  }

  it('reads status, message and field errors from the envelope', () => {
    const body = errorEnvelope(400, 'Unknown error', { name: ['This field is required.'] });
    const error = toAppError(new HttpErrorResponse({ status: 400, error: body }));
    expect(error).toEqual(jasmine.objectContaining({ status: 400, message: 'Unknown error', errors: { name: ['This field is required.'] } }));
  });

  it('passes workflow messages through as they come', () => {
    expect(fromBody('Order exceeds customer credit limit').message).toBe('Order exceeds customer credit limit');
  });

  it('keeps the response X-Request-ID as the support code', () => {
    const headers = new HttpHeaders({ 'X-Request-ID': 'c1f0' });
    expect(toAppError(new HttpErrorResponse({ status: 500, headers, error: errorEnvelope(500, 'Boom') })).requestId).toBe('c1f0');
    expect(toAppError(new HttpErrorResponse({ status: 401, headers, error: { detail: 'Expired' } })).requestId).toBe('c1f0');
    expect(toAppError(new HttpErrorResponse({ status: 400, error: errorEnvelope(400, 'Bad') })).requestId).toBeUndefined();
  });
});
