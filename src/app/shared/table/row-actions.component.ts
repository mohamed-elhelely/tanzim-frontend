import { ChangeDetectionStrategy, Component, computed, contentChildren, inject, input, output, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { AccessService } from '../../core/auth/access.service';
import { LanguageService } from '../../core/services/language.service';
import { Named, localizedName } from '../pipes/localized-name.pipe';
import { ModuleActivityService, moduleActivityFor } from '../activity/module-activity';
import { RecordDetailsService } from '../activity/record-details';

export type RowActionSeverity = 'danger' | 'secondary';

/**
 * One action of a table row, declared inside `<app-row-actions>`. It renders nothing itself: the row actions show it
 * as a button or as a menu entry. Wrap it in `@if` to show it only when allowed.
 */
@Component({
  selector: 'app-row-action',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RowActionComponent {
  /** PrimeIcons classes, e.g. `pi pi-pencil`. */
  readonly icon = input.required<string>();
  /** Translation key; the button's accessible name and the menu entry's text. */
  readonly label = input.required<string>();
  readonly severity = input<RowActionSeverity | undefined>(undefined);
  readonly disabled = input(false);
  readonly run = output<void>();
}

/** A row action as shown: a declared one, or the built-in "View logs". */
interface RowActionEntry {
  icon: string;
  label: string;
  severity?: RowActionSeverity;
  disabled: boolean;
  run: () => void;
}

/**
 * A row's actions in the table's last column. One action shows as an icon button; two or more collapse into a "⋮"
 * button that opens a menu, so rows stay narrow and every screen looks the same. Clicks never reach the row (rows
 * that open a record on click).
 *
 * With `record`, rows without a View of their own get one: the record details drawer (fields + activity log).
 * With `recordId`, on a module screen that has a system log (MODULE_ACTIVITY_RESOURCES) and for users who may read
 * it, a "View logs" entry opens the log of that one record (before any destructive action).
 *
 *   <app-row-actions [recordId]="row.id" [recordName]="row.order_number">
 *     <app-row-action icon="pi pi-eye" label="common.view" (run)="open(row)"></app-row-action>
 *     @if (canDelete) {
 *       <app-row-action icon="pi pi-trash" label="common.delete" severity="danger" (run)="confirmDelete(row)"></app-row-action>
 *     }
 *   </app-row-actions>
 */
@Component({
  selector: 'app-row-actions',
  imports: [TranslatePipe, ButtonModule, MenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center justify-end',
    '(click)': '$event.stopPropagation()',
    '(keydown.enter)': '$event.stopPropagation()',
  },
  template: `
    @if (entries().length === 1) {
      @let action = entries()[0];
      <p-button
        [icon]="action.icon"
        [severity]="action.severity"
        [text]="true"
        [rounded]="true"
        [disabled]="action.disabled"
        [ariaLabel]="action.label | translate"
        (onClick)="action.run()"
      ></p-button>
    } @else if (entries().length > 1) {
      <p-button
        icon="pi pi-ellipsis-v"
        severity="secondary"
        [text]="true"
        [rounded]="true"
        [ariaLabel]="'common.actions' | translate"
        aria-haspopup="menu"
        (onClick)="toggle(menu, $event)"
      ></p-button>
      <p-menu #menu [model]="items()" [popup]="true" appendTo="body"></p-menu>
    }
  `,
})
export class RowActionsComponent {
  private readonly translate = inject(TranslateService);
  readonly actions = contentChildren(RowActionComponent);
  /** The row's id: adds "View logs" on screens with a module log. */
  readonly recordId = input<string | number | null | undefined>(null);
  /** The row's name for the log's title: text, or a record with Arabic/English names. */
  readonly recordName = input<string | Named | null | undefined>(null);
  /** The row itself: adds "View" (its fields in the record details drawer) when the row has no View of its own. */
  readonly record = input<Readonly<Record<string, unknown>> | null | undefined>(null);
  private readonly language = inject(LanguageService);

  /** The screen's path, e.g. `/inventory/brands` (undefined for partial test routes). */
  private readonly path = screenPath(inject(ActivatedRoute, { optional: true }));
  /** The screen's module log (none on detail pages, dialogs or screens without a log). */
  private readonly module = this.path === undefined ? null : moduleActivityFor(this.path);
  private readonly access = this.module ? inject(AccessService) : null;
  private readonly activity = this.module ? inject(ModuleActivityService) : null;
  private readonly recordDetails = this.module ? inject(RecordDetailsService) : null;

  readonly entries = computed<RowActionEntry[]>(() => {
    const declared: RowActionEntry[] = this.actions().map((action) => ({
      icon: action.icon(),
      label: action.label(),
      severity: action.severity(),
      disabled: action.disabled(),
      run: () => action.run.emit(),
    }));
    const view = declared.some((entry) => entry.label === 'common.view') ? null : this.viewEntry();
    const withView = view ? [view, ...declared] : declared;
    const logs = this.logsEntry();
    if (!logs) {
      return withView;
    }
    const firstDanger = withView.findIndex((entry) => entry.severity === 'danger');
    const at = firstDanger === -1 ? withView.length : firstDanger;
    return [...withView.slice(0, at), logs, ...withView.slice(at)];
  });

  /** Built when the menu opens, so it shows the actions (and language) of that moment. */
  readonly items = signal<MenuItem[]>([]);

  toggle(menu: Menu, event: Event): void {
    this.items.set(
      this.entries().map((entry) => ({
        label: this.translate.instant(entry.label),
        icon: entry.icon,
        disabled: entry.disabled,
        styleClass: entry.severity === 'danger' ? 'row-action-danger' : undefined,
        command: () => entry.run(),
      })),
    );
    menu.toggle(event);
  }

  private viewEntry(): RowActionEntry | null {
    const record = this.record();
    const module = this.module;
    if (!module || !record) {
      return null;
    }
    const open = () => {
      const id = this.recordId() ?? (record['id'] as string | number | undefined);
      const name = this.objectName();
      this.recordDetails?.open({
        titleKey: module.titleKey,
        record,
        resource: module.resources[0],
        ...(id === null || id === undefined ? {} : { objectId: id }),
        ...(name ? { name } : {}),
        showLogs: id !== null && id !== undefined && !!this.access?.can('view_auditlog'),
        labelArea: this.path?.split('/')[1],
      });
    };
    return { icon: 'pi pi-eye', label: 'common.view', disabled: false, run: open };
  }

  private objectName(): string {
    const name = this.recordName();
    return (typeof name === 'string' ? name : localizedName(name, this.language.currentLang())).trim();
  }

  private logsEntry(): RowActionEntry | null {
    const id = this.recordId();
    const module = this.module;
    if (!module || id === null || id === undefined || id === '' || !this.access?.can('view_auditlog')) {
      return null;
    }
    // The record's own resource: a document's lines are logged under their own ids.
    const open = () => {
      const objectName = this.objectName();
      this.activity?.open({
        titleKey: module.titleKey,
        resources: [module.resources[0]],
        objectId: id,
        ...(objectName ? { objectName } : {}),
      });
    };
    return { icon: 'pi pi-history', label: 'activityLog.viewLogs', disabled: false, run: open };
  }
}

function screenPath(route: ActivatedRoute | null): string | undefined {
  // Partial routes (test stubs) have no path: no module log then.
  const path = route?.snapshot?.pathFromRoot?.flatMap((r) => r.url?.map((segment) => segment.path) ?? []).join('/');
  return path === undefined ? undefined : `/${path}`;
}
