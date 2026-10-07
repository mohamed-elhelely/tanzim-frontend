import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [TranslatePipe, NgIf],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input() title: string = 'common.empty';
  @Input() message?: string;
  @Input() icon: string = 'pi-inbox';
}
