import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NavListComponent } from '../nav/nav-list.component';

@Component({
    selector: 'app-sidebar',
    imports: [TranslatePipe, NavListComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.scss'
})
export class AppSidebarComponent {}
