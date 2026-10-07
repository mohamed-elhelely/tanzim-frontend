import { Component, Input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-loading-state',
  imports: [ProgressSpinnerModule, TranslatePipe],
  templateUrl: './loading-state.component.html',
  styleUrl: './loading-state.component.scss',
})
export class LoadingStateComponent {
  @Input() message: string = 'common.loading';
  @Input() showMessage: boolean = true;
}
