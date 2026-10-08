import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';

@Component({
  selector: 'app-import-export-page',
  imports: [ComingSoonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon title="nav.importExport" icon="pi-file-import"></app-coming-soon>
  `,
})
export class ImportExportPageComponent {}
