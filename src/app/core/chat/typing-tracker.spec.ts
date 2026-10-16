import { fakeAsync, tick } from '@angular/core/testing';
import { TYPING_SHOW_MS, TypingTracker } from './typing-tracker';

describe('TypingTracker', () => {
  it('shows a typing user for a few seconds, restarting on repeat', fakeAsync(() => {
    const typing = new TypingTracker();
    typing.add(12, 45);
    typing.add(12, 51);
    expect(typing.usersIn(12)).toEqual([45, 51]);
    tick(TYPING_SHOW_MS - 1000);
    typing.add(12, 45);
    tick(1000);
    expect(typing.usersIn(12)).toEqual([45]);
    tick(TYPING_SHOW_MS);
    expect(typing.usersIn(12)).toEqual([]);
  }));

  it('clears one user and resets everything', fakeAsync(() => {
    const typing = new TypingTracker();
    typing.add(12, 45);
    typing.add(13, 51);
    typing.clear(12, 45);
    expect(typing.usersIn(12)).toEqual([]);
    typing.reset();
    expect(typing.usersIn(13)).toEqual([]);
    tick(TYPING_SHOW_MS);
  }));
});
