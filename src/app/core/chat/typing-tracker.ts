import { signal } from '@angular/core';

/** How long "X is typing…" stays after the last typing event. */
export const TYPING_SHOW_MS = 5_000;

/** Who is typing in which chat; each entry expires on its own. */
export class TypingTracker {
  private readonly state = signal<ReadonlyMap<number, readonly number[]>>(new Map());
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  readonly all = this.state.asReadonly();

  usersIn(conversationId: number): number[] {
    return [...(this.state().get(conversationId) ?? [])];
  }

  add(conversationId: number, userId: number): void {
    const key = `${conversationId}:${userId}`;
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(() => this.clear(conversationId, userId), TYPING_SHOW_MS));
    const users = this.state().get(conversationId) ?? [];
    if (!users.includes(userId)) {
      this.state.update((map) => new Map(map).set(conversationId, [...users, userId]));
    }
  }

  clear(conversationId: number, userId: number): void {
    const key = `${conversationId}:${userId}`;
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    const users = this.state().get(conversationId);
    if (!users?.includes(userId)) {
      return;
    }
    this.state.update((map) => {
      const next = new Map(map);
      const left = users.filter((id) => id !== userId);
      if (left.length) {
        next.set(conversationId, left);
      } else {
        next.delete(conversationId);
      }
      return next;
    });
  }

  reset(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.state.set(new Map());
  }
}
