import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

export type ButtonSeverity = 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast';
export type ButtonVariant = 'solid' | 'outlined' | 'text';
/** `always`: fills its container. `mobile`: fills it below the `sm` breakpoint, natural width above. */
export type ButtonWidth = 'auto' | 'always' | 'mobile';

/**
 * The app's button. Screens use this instead of the UI library's button, so a library update or swap happens here.
 * `label` comes translated (`[label]="'common.save' | translate"`); `icon` is a PrimeIcons class (`pi pi-plus`).
 * Layout classes on the element (`class="sm:ms-auto"`) apply to the button's box.
 */
@Component({
  selector: 'app-button',
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
  host: {
    class: 'inline-flex',
    '[class.w-full]': "width() !== 'auto'",
    '[class.sm:w-auto]': "width() === 'mobile'",
  },
})
export class ButtonComponent {
  readonly label = input<string>();
  readonly icon = input<string>();
  readonly severity = input<ButtonSeverity>('primary');
  readonly variant = input<ButtonVariant>('solid');
  readonly size = input<'small' | 'large'>();
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly rounded = input(false);
  readonly width = input<ButtonWidth>('auto');
  /** Mirror the icon in Arabic (arrows that point "back" or "forward"). */
  readonly flipIconInRtl = input(false);
  readonly ariaLabel = input<string>();

  readonly clicked = output<MouseEvent>();

  readonly styleClass = computed(() =>
    [this.width() !== 'auto' ? 'w-full' : '', this.flipIconInRtl() ? 'rtl:[&_.pi]:rotate-180' : ''].filter(Boolean).join(' '),
  );
}
