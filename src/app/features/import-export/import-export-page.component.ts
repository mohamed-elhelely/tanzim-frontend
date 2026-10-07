import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
    selector: 'app-import-export-page',
    imports: [PageHeaderComponent, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-page-header title="nav.importExport" subtitle="common.comingSoon"></app-page-header>
    <app-empty-state title="common.empty" icon="pi-file-import"></app-empty-state>
  `
})
export class ImportExportPageComponent {}
