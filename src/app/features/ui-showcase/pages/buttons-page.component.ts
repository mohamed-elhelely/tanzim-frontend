import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ButtonComponent, ButtonSeverity, ButtonVariant } from '../../../shared/ui';
import { ShowcaseSectionComponent } from '../showcase-section.component';

@Component({
  selector: 'app-buttons-page',
  imports: [ButtonComponent, ShowcaseSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './buttons-page.component.html',
})
export class ButtonsPageComponent {
  readonly severities: ButtonSeverity[] = ['primary', 'secondary', 'success', 'info', 'warn', 'danger', 'help', 'contrast'];
  readonly variants: ButtonVariant[] = ['solid', 'outlined', 'text'];
  readonly clicks = signal(0);
  readonly saving = signal(false);

  save(): void {
    this.saving.set(true);
    setTimeout(() => this.saving.set(false), 1500);
  }

  readonly code = {
    basic: `<app-button [label]="'common.save' | translate" icon="pi pi-check" (clicked)="save()"></app-button>`,
    variant: `<app-button severity="danger" variant="outlined" [label]="'common.delete' | translate"></app-button>`,
    states: `<app-button type="submit" [loading]="saving()" [disabled]="form.invalid" [label]="…"></app-button>`,
    icon: `<app-button icon="pi pi-times" variant="text" [rounded]="true" [ariaLabel]="'common.close' | translate"></app-button>`,
    width: `<app-button width="mobile" class="sm:ms-auto" [label]="…"></app-button>`,
    rtl: `<app-button icon="pi pi-arrow-left" [flipIconInRtl]="true" variant="text" [ariaLabel]="…"></app-button>`,
  };
}
