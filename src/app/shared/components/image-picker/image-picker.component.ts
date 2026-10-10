import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

/** The backend's upload limit (profile picture, company logo). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * An image with Choose / Remove buttons, e.g. a profile picture or a company logo. It only previews: the parent
 * keeps the pending change from `changed` (a File to upload, or null to remove) and sends it on save.
 */
@Component({
  selector: 'app-image-picker',
  imports: [TranslatePipe, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-picker.component.html',
})
export class ImagePickerComponent {
  /** The saved image's URL. */
  readonly url = input<string | null>(null);
  readonly shape = input<'circle' | 'square'>('square');
  /** Shown when there is no image, e.g. initials. */
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly changed = output<File | null>();

  /** undefined = no change; null = removed; an object URL = picked. */
  private readonly preview = signal<string | null | undefined>(undefined);
  readonly tooLarge = signal(false);
  readonly shown = computed(() => (this.preview() === undefined ? this.url() : this.preview()));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revoke());
  }

  onPicked(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) {
      return;
    }
    this.tooLarge.set(file.size > MAX_IMAGE_BYTES);
    if (this.tooLarge()) {
      return;
    }
    this.revoke();
    this.preview.set(URL.createObjectURL(file));
    this.changed.emit(file);
  }

  remove(): void {
    this.revoke();
    this.tooLarge.set(false);
    this.preview.set(null);
    this.changed.emit(null);
  }

  /** Back to the saved image, e.g. after a successful save. */
  reset(): void {
    this.revoke();
    this.preview.set(undefined);
  }

  private revoke(): void {
    const current = this.preview();
    if (current) {
      URL.revokeObjectURL(current);
    }
  }
}
