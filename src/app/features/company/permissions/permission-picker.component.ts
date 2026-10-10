import { ChangeDetectionStrategy, Component, OnInit, computed, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  PermissionAction,
  isSystemCodename,
  moduleCodename,
  resourceLabelKey,
} from '../../../core/auth/permission-catalog';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PermissionOption } from '../company.models';
import { PermissionService } from './permission.service';

interface PickerRow {
  resource: string;
  labelKey: string;
  /** One per PERMISSION_ACTIONS entry; null when the resource has no such action (or the company lacks the row). */
  cells: Array<number | null>;
}

interface PickerModule {
  code: string;
  labelKey: string;
  accessId: number | null;
  rows: PickerRow[];
  /** Every permission id in the module, the access one included. */
  ids: number[];
}

/**
 * Picks permission ids for a role or a permission group (form control value: `number[]`). The company's permissions
 * are laid out by module as in the backend catalog: the module's access switch, then a row per resource with
 * view / add / change / delete. Company-defined codenames are listed under "Other".
 */
@Component({
  selector: 'app-permission-picker',
  imports: [TranslatePipe, LoadingStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-picker.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PermissionPickerComponent), multi: true }],
})
export class PermissionPickerComponent implements ControlValueAccessor, OnInit {
  private readonly api = inject(PermissionService);
  private readonly options = signal<PermissionOption[] | null>(null);
  /** Open modules; null until the user toggles one, meaning "the modules that hold a selection". */
  private readonly expanded = signal<ReadonlySet<string> | null>(null);
  private onChange: (value: number[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  readonly actions = PERMISSION_ACTIONS;
  readonly selected = signal<ReadonlySet<number>>(new Set());
  readonly disabled = signal(false);
  readonly loading = computed(() => this.options() === null);

  readonly modules = computed<PickerModule[]>(() => {
    const byCodename = new Map((this.options() ?? []).map((option) => [option.codename, option.id]));
    return PERMISSION_MODULES.map((module) => {
      const accessId = byCodename.get(moduleCodename(module.code)) ?? null;
      const rows = module.resources.map(({ resource, actions }) => ({
        resource,
        labelKey: resourceLabelKey(resource),
        cells: PERMISSION_ACTIONS.map((action: PermissionAction) =>
          actions.includes(action) ? (byCodename.get(`${action}_${resource}`) ?? null) : null,
        ),
      }));
      const ids = [accessId, ...rows.flatMap((row) => row.cells)].filter((id): id is number => id !== null);
      return { code: module.code, labelKey: module.labelKey, accessId, rows, ids };
    }).filter((module) => module.ids.length > 0);
  });

  /** The company's own codenames, outside the catalog. */
  readonly others = computed(() => (this.options() ?? []).filter((option) => !isSystemCodename(option.codename)));
  readonly selectedCount = computed(() => this.selected().size);

  ngOnInit(): void {
    this.api.dropdown<PermissionOption>().subscribe({
      next: (items) => this.options.set(items),
      error: () => this.options.set([]),
    });
  }

  writeValue(value: number[] | null): void {
    this.selected.set(new Set(value ?? []));
    this.expanded.set(null);
  }

  registerOnChange(fn: (value: number[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  /** Modules that hold a selection start open, so an edit shows what the role or group grants. */
  isExpanded(module: PickerModule): boolean {
    return this.expanded()?.has(module.code) ?? this.countIn(module) > 0;
  }

  toggleExpanded(module: PickerModule): void {
    this.expanded.update((current) => {
      const next = new Set(current ?? this.modules().filter((m) => this.countIn(m) > 0).map((m) => m.code));
      if (next.has(module.code)) {
        next.delete(module.code);
      } else {
        next.add(module.code);
      }
      return next;
    });
  }

  isSelected(id: number | null): boolean {
    return id !== null && this.selected().has(id);
  }

  countIn(module: PickerModule): number {
    const selected = this.selected();
    return module.ids.filter((id) => selected.has(id)).length;
  }

  toggle(id: number | null): void {
    if (id === null || this.disabled()) {
      return;
    }
    this.change((next) => (next.has(id) ? next.delete(id) : next.add(id)));
  }

  /** Selects the whole module, or clears it when it is already complete. */
  toggleModule(module: PickerModule): void {
    if (this.disabled()) {
      return;
    }
    const all = this.countIn(module) === module.ids.length;
    this.change((next) => module.ids.forEach((id) => (all ? next.delete(id) : next.add(id))));
  }

  private change(mutate: (next: Set<number>) => void): void {
    const next = new Set(this.selected());
    mutate(next);
    this.selected.set(next);
    this.onChange([...next].sort((a, b) => a - b));
    this.onTouched();
  }
}
