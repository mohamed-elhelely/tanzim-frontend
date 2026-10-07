import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { NgIf } from '@angular/common';

@Component({
    selector: 'app-error-state',
    imports: [TranslatePipe, ButtonModule, NgIf],
    templateUrl: './error-state.component.html',
    styleUrl: './error-state.component.scss'
})
export class ErrorStateComponent {
  @Input() title: string = 'common.error';
  @Input() message?: string;
  @Input() showRetry: boolean = true;
  @Output() retry = new EventEmitter<void>();
}
