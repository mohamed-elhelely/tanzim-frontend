import { Observable, of, throwError } from 'rxjs';
import { LineApi, syncLines } from './sync-lines';

interface Body {
  qty: string;
}

describe('syncLines', () => {
  let calls: string[];
  let api: LineApi<Body>;

  beforeEach(() => {
    calls = [];
    api = {
      create: (body) => record(`create ${body.qty}`),
      update: (id, body) => record(`update ${id} ${body.qty}`),
      remove: (id) => record(`remove ${id}`),
    };
  });

  function record(call: string): Observable<unknown> {
    calls.push(call);
    return of(null);
  }

  it('deletes removed lines, then updates kept ones and creates new ones in order', () => {
    let done = false;
    syncLines(api, [1, 2, 3], [
      { id: 3, body: { qty: '5' } },
      { id: null, body: { qty: '7' } },
      { id: 1, body: { qty: '2' } },
    ]).subscribe(() => (done = true));
    expect(calls).toEqual(['remove 2', 'update 3 5', 'create 7', 'update 1 2']);
    expect(done).toBeTrue();
  });

  it('completes with nothing to do', () => {
    let done = false;
    syncLines(api, [], []).subscribe(() => (done = true));
    expect(done).toBeTrue();
  });

  it('stops at the first failure', () => {
    api.update = () => throwError(() => new Error('nope'));
    let failed = false;
    syncLines(api, [], [
      { id: 4, body: { qty: '1' } },
      { id: null, body: { qty: '2' } },
    ]).subscribe({ error: () => (failed = true) });
    expect(failed).toBeTrue();
    expect(calls).toEqual([]);
  });
});
