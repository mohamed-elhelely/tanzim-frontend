import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'tanzim.notificationSound';
/** A burst (several notifications from one save) rings once. */
const QUIET_AFTER_MS = 1500;

/**
 * `normal` for operational notifications; `alert` for changes to the user's own access, warnings and errors;
 * `chat` for a new chat message, so it is told apart from the bell without looking.
 */
export type NotificationTone = 'normal' | 'alert' | 'chat';

/** Short notes per tone: [frequency in Hz, start offset in seconds]. */
const NOTES: Record<NotificationTone, [number, number][]> = {
  normal: [
    [880, 0],
    [1320, 0.12],
  ],
  alert: [
    [660, 0],
    [660, 0.18],
  ],
  // A quick rising "pop-pop-pop" (C, E, G), lighter than the bell's chime.
  chat: [
    [1047, 0],
    [1319, 0.07],
    [1568, 0.14],
  ],
};

/**
 * The sound a new notification makes: a short chime made with the Web Audio API (no audio file). The user can mute
 * it from the bell; the choice is kept in this browser.
 *
 * Browsers only let a page play sound after the user has interacted with it, so the audio context is created (or
 * resumed) on the first click or key press; until then a notification is silent.
 */
@Injectable({ providedIn: 'root' })
export class NotificationSoundService {
  private readonly enabledState = signal(this.readEnabled());
  private context: AudioContext | null = null;
  private lastPlayed = 0;

  readonly enabled = this.enabledState.asReadonly();

  constructor() {
    if (typeof document !== 'undefined') {
      const unlock = () => {
        this.audio()?.resume().catch(() => undefined);
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('pointerdown', unlock);
      document.addEventListener('keydown', unlock);
    }
  }

  toggle(): void {
    const enabled = !this.enabledState();
    this.enabledState.set(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Storage blocked (private mode): the choice lasts for this visit.
    }
    if (enabled) {
      this.play('normal', true);
    }
  }

  /** Rings unless muted, still locked by the browser, or another notification rang a moment ago. */
  play(tone: NotificationTone, force = false): void {
    const now = Date.now();
    if (!this.enabledState() || (!force && now - this.lastPlayed < QUIET_AFTER_MS)) {
      return;
    }
    const context = this.audio();
    if (!context || context.state !== 'running') {
      return;
    }
    this.lastPlayed = now;
    for (const [frequency, offset] of NOTES[tone]) {
      this.note(context, frequency, context.currentTime + offset);
    }
  }

  private note(context: AudioContext, frequency: number, start: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    // Quick fade in and out so the note doesn't click.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.3);
  }

  private audio(): AudioContext | null {
    if (!this.context && typeof AudioContext !== 'undefined') {
      try {
        this.context = new AudioContext();
      } catch {
        return null;
      }
    }
    return this.context;
  }

  private readEnabled(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  }
}
