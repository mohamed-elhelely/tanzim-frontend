import { UserNamePipe, userName } from './user-name.pipe';

describe('userName', () => {
  it('prefers full_name', () => {
    expect(userName({ full_name: 'Sara Ali', first_name: 'S', last_name: 'A' })).toBe('Sara Ali');
  });

  it('joins first and last name', () => {
    expect(userName({ first_name: 'Sara', last_name: 'Ali' })).toBe('Sara Ali');
  });

  it('falls back to the email', () => {
    expect(userName({ first_name: '', last_name: '', email: 'sara@acme.example' })).toBe('sara@acme.example');
  });

  it('returns an empty string for null', () => {
    expect(userName(null)).toBe('');
  });

  it('works as a pipe', () => {
    expect(new UserNamePipe().transform({ first_name: 'Sara', last_name: 'Ali' })).toBe('Sara Ali');
  });
});
