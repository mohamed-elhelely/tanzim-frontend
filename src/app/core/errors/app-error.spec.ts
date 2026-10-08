import { HttpErrorResponse } from '@angular/common/http';
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

  it("unwraps a stringified Django ValidationError (\"['…']\")", () => {
    expect(fromBody("['Order exceeds customer credit limit']").message).toBe('Order exceeds customer credit limit');
    expect(fromBody('["Cannot confirm order in confirmed status"]').message).toBe('Cannot confirm order in confirmed status');
  });

  it('leaves normal messages alone', () => {
    expect(fromBody('No SalesOrder matches the given query.').message).toBe('No SalesOrder matches the given query.');
  });
});
