import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ChatApiService } from '../../core/chat/chat-api.service';
import { formatSize, isImageFile } from '../../core/chat/chat-format';
import { ChatAttachment } from '../../core/chat/chat.models';
import { saveFile } from '../../shared/utils/save-file';

/**
 * An image thumbnail or a file chip. The download needs the Authorization header, so files come as blobs; the
 * thumbnail's object URL is released when the message leaves the screen.
 */
@Component({
  selector: 'app-chat-attachment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (image() && src(); as url) {
      <button type="button" class="block overflow-hidden rounded-lg" [title]="attachment().filename" (click)="download()">
        <img [src]="url" [alt]="attachment().filename" class="max-h-48 max-w-full object-cover" />
      </button>
    } @else {
      <button
        type="button"
        class="flex max-w-full items-center gap-2 rounded-lg border border-black/10 bg-white/60 px-2.5 py-1.5 text-start text-xs dark:border-white/10 dark:bg-black/20"
        [disabled]="!attachment().url"
        (click)="download()"
      >
        <i class="pi pi-file shrink-0"></i>
        <span class="min-w-0">
          <span class="block truncate font-medium">{{ attachment().filename }}</span>
          <span class="block opacity-70">{{ size() }}</span>
        </span>
      </button>
    }
  `,
})
export class ChatAttachmentComponent {
  readonly attachment = input.required<ChatAttachment>();
  private readonly api = inject(ChatApiService);
  readonly image = computed(() => isImageFile(this.attachment().filename));
  readonly size = computed(() => formatSize(this.attachment().size));
  readonly src = signal<string | null>(null);
  private objectUrl: string | null = null;

  constructor() {
    effect(() => {
      const attachment = this.attachment();
      if (!this.image() || !attachment.url) {
        return;
      }
      untracked(() =>
        this.api.attachment(attachment.url).subscribe({
          next: (blob) => {
            this.release();
            this.objectUrl = URL.createObjectURL(blob);
            this.src.set(this.objectUrl);
          },
          error: () => undefined,
        }),
      );
    });
    inject(DestroyRef).onDestroy(() => this.release());
  }

  download(): void {
    const attachment = this.attachment();
    if (!attachment.url) {
      return;
    }
    this.api.attachment(attachment.url).subscribe({ next: (blob) => saveFile(blob, attachment.filename), error: () => undefined });
  }

  private release(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
