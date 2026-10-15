import { ChangeDetectionStrategy, Component, computed, contentChildren, inject, input, output, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { AccessService } from '../../core/auth/access.service';
import { LanguageService } from '../../core/services/language.service';
import { Named, localizedName } from '../pipes/localized-name.pipe';
import { ModuleActivity, ModuleActivityService, moduleActivityFor } from '../activity/module-activity';

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
  private readonly language = inject(LanguageService);

  /** The screen's module log, from its path (none on detail pages, dialogs or screens without a log). */
  private readonly module = moduleActivity(inject(ActivatedRoute, { optional: true }));
  private readonly access = this.module ? inject(AccessService) : null;
  private readonly activity = this.module ? inject(ModuleActivityService) : null;

  readonly entries = computed<RowActionEntry[]>(() => {
    const declared: RowActionEntry[] = this.actions().map((action) => ({
      icon: action.icon(),
      label: action.label(),
      severity: action.severity(),
      disabled: action.disabled(),
      run: () => action.run.emit(),
    }));
    const logs = this.logsEntry();
    if (!logs) {
      return declared;
    }
    const firstDanger = declared.findIndex((entry) => entry.severity === 'danger');
    const at = firstDanger === -1 ? declared.length : firstDanger;
    return [...declared.slice(0, at), logs, ...declared.slice(at)];
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

  private logsEntry(): RowActionEntry | null {
    const id = this.recordId();
    const module = this.module;
    if (!module || id === null || id === undefined || id === '' || !this.access?.can('view_auditlog')) {
      return null;
    }
    // The record's own resource: a document's lines are logged under their own ids.
    const open = () => {
      const name = this.recordName();
      const objectName = (typeof name === 'string' ? name : localizedName(name, this.language.currentLang())).trim();
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

function moduleActivity(route: ActivatedRoute | null): ModuleActivity | null {
  // Partial routes (test stubs) have no path: no module log then.
  const path = route?.snapshot?.pathFromRoot?.flatMap((r) => r.url?.map((segment) => segment.path) ?? []).join('/');
  return path === undefined ? null : moduleActivityFor(`/${path}`);
}
