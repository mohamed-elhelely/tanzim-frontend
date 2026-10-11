import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { canEncodeCode128, code128Bars } from '../../utils/code128';

/** A Code 128 barcode as SVG (scales cleanly when printed), with the value underneath. Non-ASCII shows the text only. */
@Component({
  selector: 'app-barcode',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (symbol(); as s) {
      <svg
        [attr.viewBox]="'0 0 ' + s.width + ' ' + height()"
        preserveAspectRatio="none"
        class="block h-full w-full"
        role="img"
        [attr.aria-label]="value()"
      >
        <rect [attr.width]="s.width" [attr.height]="height()" fill="#fff"></rect>
        @for (bar of s.bars; track $index) {
          <rect [attr.x]="bar.x" y="0" [attr.width]="bar.width" [attr.height]="height()" fill="#000"></rect>
        }
      </svg>
    }
    <p class="mt-0.5 text-center font-mono text-[0.6rem] leading-none tracking-wider" dir="ltr">{{ value() }}</p>
  `,
  host: { class: 'flex flex-col' },
})
export class BarcodeComponent {
  readonly value = input.required<string>();
  /** Bar height in modules (the SVG stretches to its box). */
  readonly height = input(40);

  readonly symbol = computed(() => (canEncodeCode128(this.value()) ? code128Bars(this.value()) : null));
}
