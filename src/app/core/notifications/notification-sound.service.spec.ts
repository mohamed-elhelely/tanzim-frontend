import { TestBed } from '@angular/core/testing';
import { NotificationSoundService } from './notification-sound.service';

/** Stands in for the browser AudioContext and counts the notes played. */
class FakeAudioContext {
  static last: FakeAudioContext | null = null;
  state: 'suspended' | 'running' = 'suspended';
  currentTime = 0;
  notes = 0;
  readonly destination = {};
  constructor() {
    FakeAudioContext.last = this;
  }
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
  createOscillator() {
    return {
      type: '',
      frequency: { value: 0 },
      connect: (node: unknown) => node,
      start: () => (this.notes += 1),
      stop: () => undefined,
    };
  }
  createGain() {
    const param = { setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined };
    return { gain: param, connect: (node: unknown) => node };
  }
}

describe('NotificationSoundService', () => {
  let original: typeof AudioContext;

  beforeEach(() => {
    original = window.AudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    FakeAudioContext.last = null;
    localStorage.removeItem('tanzim.notificationSound');
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-15T10:00:00Z'));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    window.AudioContext = original;
    localStorage.removeItem('tanzim.notificationSound');
  });

  async function unlocked(): Promise<NotificationSoundService> {
    const sound = TestBed.inject(NotificationSoundService);
    document.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    return sound;
  }

  it('stays silent until the user has interacted with the page', () => {
    const sound = TestBed.inject(NotificationSoundService);
    sound.play('normal');
    expect(FakeAudioContext.last?.notes ?? 0).toBe(0);
  });

  it('rings once for a burst of notifications', async () => {
    const sound = await unlocked();
    sound.play('normal');
    sound.play('alert');
    expect(FakeAudioContext.last?.notes).toBe(2);
    jasmine.clock().tick(1500);
    sound.play('alert');
    expect(FakeAudioContext.last?.notes).toBe(4);
  });

  it('has its own three-note sound for chat messages', async () => {
    const sound = await unlocked();
    sound.play('chat');
    expect(FakeAudioContext.last?.notes).toBe(3);
  });

  it('can be muted, and remembers it', async () => {
    const sound = await unlocked();
    sound.toggle();
    expect(sound.enabled()).toBeFalse();
    expect(localStorage.getItem('tanzim.notificationSound')).toBe('off');
    sound.play('normal');
    expect(FakeAudioContext.last?.notes).toBe(0);

    // Turning it back on plays a sample at once.
    sound.toggle();
    expect(sound.enabled()).toBeTrue();
    expect(FakeAudioContext.last?.notes).toBe(2);
  });
});
