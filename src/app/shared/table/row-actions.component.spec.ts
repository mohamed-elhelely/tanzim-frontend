import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AccessService } from '../../core/auth/access.service';
import { LanguageService } from '../../core/services/language.service';
import { ModuleActivityService } from '../activity/module-activity';
import { RecordDetailsService } from '../activity/record-details';
import { RowActionComponent, RowActionsComponent } from './row-actions.component';

@Component({
  imports: [RowActionsComponent, RowActionComponent],
  template: `
    <table>
      <tr (click)="rowClicks = rowClicks + 1">
        <td>
          <app-row-actions [recordId]="recordId" [recordName]="recordName">
            <app-row-action icon="pi pi-eye" label="common.view" (run)="ran.push('view')"></app-row-action>
            @if (canDelete()) {
              <app-row-action icon="pi pi-trash" label="common.delete" severity="danger" (run)="ran.push('delete')"></app-row-action>
            }
          </app-row-actions>
        </td>
      </tr>
    </table>
  `,
})
class HostComponent {
  readonly canDelete = signal(false);
  recordId: number | null = null;
  recordName: string | { name_en: string; name_ar: string } | null = null;
  ran: string[] = [];
  rowClicks = 0;
}

describe('RowActionsComponent', () => {
  function render() {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideTranslateService()] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function buttons(el: HTMLElement): HTMLButtonElement[] {
    return [...el.querySelectorAll('app-row-actions button')] as HTMLButtonElement[];
  }

  it('shows a single action as its own button, without reaching the row', () => {
    const fixture = render();
    const [button] = buttons(fixture.nativeElement);
    expect(buttons(fixture.nativeElement).length).toBe(1);
    expect(button.getAttribute('aria-label')).toBe('common.view');
    button.click();
    expect(fixture.componentInstance.ran).toEqual(['view']);
    expect(fixture.componentInstance.rowClicks).toBe(0);
  });

  it('collapses two or more actions into a "⋮" menu that runs the chosen one', () => {
    const fixture = render();
    fixture.componentInstance.canDelete.set(true);
    fixture.detectChanges();
    const [toggle] = buttons(fixture.nativeElement);
    expect(buttons(fixture.nativeElement).length).toBe(1);
    expect(toggle.getAttribute('aria-label')).toBe('common.actions');
    expect(toggle.querySelector('.pi-ellipsis-v')).not.toBeNull();

    toggle.click();
    fixture.detectChanges();
    const actions = fixture.debugElement.query((d) => d.componentInstance instanceof RowActionsComponent).componentInstance as RowActionsComponent;
    const items = actions.items();
    expect(items.map((item) => [item.label, item.icon, item.styleClass])).toEqual([
      ['common.view', 'pi pi-eye', undefined],
      ['common.delete', 'pi pi-trash', 'row-action-danger'],
    ]);
    items[1].command?.({});
    expect(fixture.componentInstance.ran).toEqual(['delete']);
    expect(fixture.componentInstance.rowClicks).toBe(0);
  });

  describe('View logs', () => {
    function renderOn(canReadLog: boolean, recordName: HostComponent['recordName'] = null, lang = 'en') {
      const drawer = jasmine.createSpyObj<ModuleActivityService>('ModuleActivityService', ['open']);
      TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [
          provideTranslateService(),
          // The brands list screen.
          { provide: ActivatedRoute, useValue: { snapshot: { pathFromRoot: [{ url: [] }, { url: [{ path: 'inventory' }] }, { url: [{ path: 'brands' }] }] } } },
          { provide: AccessService, useValue: { can: (codename: string) => canReadLog && codename === 'view_auditlog' } },
          { provide: ModuleActivityService, useValue: drawer },
          { provide: LanguageService, useValue: { currentLang: signal(lang) } },
        ],
      });
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.recordId = 7;
      fixture.componentInstance.recordName = recordName;
      fixture.componentInstance.canDelete.set(true);
      fixture.detectChanges();
      const actions = fixture.debugElement.query((d) => d.componentInstance instanceof RowActionsComponent).componentInstance as RowActionsComponent;
      return { actions, drawer };
    }

    it("opens the log of the row's record, listed before the destructive actions", () => {
      const { actions, drawer } = renderOn(true);
      expect(actions.entries().map((entry) => entry.label)).toEqual(['common.view', 'activityLog.viewLogs', 'common.delete']);
      actions.entries()[1].run();
      expect(drawer.open).toHaveBeenCalledWith({ titleKey: 'nav.brands', resources: ['brand'], objectId: 7 });
    });

    it("names the record in the log's title, in the interface language", () => {
      const { actions, drawer } = renderOn(true, { name_en: 'Cairo', name_ar: 'القاهرة' }, 'ar');
      actions.entries()[1].run();
      expect(drawer.open).toHaveBeenCalledWith({ titleKey: 'nav.brands', resources: ['brand'], objectId: 7, objectName: 'القاهرة' });
    });

    it('is left out without view_auditlog', () => {
      const { actions } = renderOn(false);
      expect(actions.entries().map((entry) => entry.label)).toEqual(['common.view', 'common.delete']);
    });
  });

  describe('View (record details)', () => {
    @Component({
      imports: [RowActionsComponent, RowActionComponent],
      template: `
        <app-row-actions [recordId]="7" [record]="row" recordName="ErgoSeat">
          <app-row-action icon="pi pi-pencil" label="common.edit" (run)="0"></app-row-action>
        </app-row-actions>
      `,
    })
    class EditOnlyHost {
      row = { id: 7, name: 'ErgoSeat' };
    }

    it("adds View before the row's own actions and opens the record's details with its log", () => {
      const details = jasmine.createSpyObj<RecordDetailsService>('RecordDetailsService', ['open']);
      TestBed.configureTestingModule({
        imports: [EditOnlyHost],
        providers: [
          provideTranslateService(),
          { provide: ActivatedRoute, useValue: { snapshot: { pathFromRoot: [{ url: [] }, { url: [{ path: 'inventory' }] }, { url: [{ path: 'brands' }] }] } } },
          { provide: AccessService, useValue: { can: () => true } },
          { provide: ModuleActivityService, useValue: jasmine.createSpyObj('ModuleActivityService', ['open']) },
          { provide: RecordDetailsService, useValue: details },
        ],
      });
      const fixture = TestBed.createComponent(EditOnlyHost);
      fixture.detectChanges();
      const actions = fixture.debugElement.query((d) => d.componentInstance instanceof RowActionsComponent).componentInstance as RowActionsComponent;
      expect(actions.entries().map((entry) => entry.label)).toEqual(['common.view', 'common.edit', 'activityLog.viewLogs']);
      actions.entries()[0].run();
      expect(details.open).toHaveBeenCalledWith({
        titleKey: 'nav.brands',
        record: { id: 7, name: 'ErgoSeat' },
        resource: 'brand',
        objectId: 7,
        name: 'ErgoSeat',
        showLogs: true,
        labelArea: 'inventory',
      });
    });
  });
});
