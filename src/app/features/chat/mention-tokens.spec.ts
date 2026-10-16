import { decodeMentions, encodeMentions, mentionQuery } from './mention-tokens';

describe('mention tokens', () => {
  it('encodes picked names as @[id]', () => {
    expect(encodeMentions('@Omar Nasr see this', [{ id: 51, display: '@Omar Nasr' }])).toBe('@[51] see this');
  });

  it('encodes the longest name first', () => {
    const tokens = [{ id: 1, display: '@Sara' }, { id: 2, display: '@Sara Ali' }];
    expect(encodeMentions('@Sara Ali and @Sara', tokens)).toBe('@[2] and @[1]');
  });

  it('leaves names the user typed by hand alone', () => {
    expect(encodeMentions('@Omar hi', [])).toBe('@Omar hi');
  });

  it('decodes a stored body for editing', () => {
    const decoded = decodeMentions('@[51] and @[99]', (id) => (id === 51 ? 'Omar Nasr' : undefined));
    expect(decoded.text).toBe('@Omar Nasr and @[99]');
    expect(decoded.tokens).toEqual([{ id: 51, display: '@Omar Nasr' }]);
  });

  it('finds the @query being typed at the caret', () => {
    expect(mentionQuery('hello @Om', 9)).toEqual({ start: 6, query: 'Om' });
    expect(mentionQuery('@', 1)).toEqual({ start: 0, query: '' });
    expect(mentionQuery('mail a@b', 8)).toBeNull();
    expect(mentionQuery('@Om x', 5)).toBeNull();
  });
});
