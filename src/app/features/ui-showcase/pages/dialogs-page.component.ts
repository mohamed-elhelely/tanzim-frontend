import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { DialogComponent, DialogFooterDirective } from '../../../shared/ui/dialog/dialog.component';
import { ShowcaseSectionComponent } from '../showcase-section.component';

@Component({
  selector: 'app-dialogs-page',
  imports: [ButtonComponent, DialogComponent, DialogFooterDirective, ShowcaseSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialogs-page.component.html',
})
export class DialogsPageComponent {
  readonly basic = signal(false);
  readonly withFooter = signal(false);
  readonly wide = signal(false);
  readonly top = signal(false);
  readonly shown = signal(0);

  readonly code = {
    basic: `<app-dialog [(visible)]="open" [header]="'…' | translate" width="28rem" [dismissable]="true">…</app-dialog>`,
    footer: `<app-dialog …>\n  …form…\n  <ng-template appDialogFooter>\n    <app-button …></app-button>\n  </ng-template>\n</app-dialog>`,
  };
}
