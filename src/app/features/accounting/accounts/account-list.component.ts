import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_SEVERITY, Account, AccountType } from '../accounting.models';
import { AccountService } from './account.service';

export interface AccountRow extends Account {
  /** Nesting level under its parents, for the indentation. */
  depth: number;
}

/** Puts each account right after its parent, so the flat list reads as a tree. */
export function toTree(accounts: Account[]): AccountRow[] {
  const byParent = new Map<number | null, Account[]>();
  const ids = new Set(accounts.map((account) => account.id));
  for (const account of accounts) {
    // An account whose parent isn't in the list is shown at the top level.
    const key = account.parent !== null && ids.has(account.parent) ? account.parent : null;
    byParent.set(key, [...(byParent.get(key) ?? []), account]);
  }
  const rows: AccountRow[] = [];
  const visit = (parent: number | null, depth: number) => {
    for (const account of (byParent.get(parent) ?? []).sort((a, b) => a.code.localeCompare(b.code))) {
      rows.push({ ...account, depth });
      visit(account.id, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}

/** Chart of accounts as an indented tree (client list: the chart is small and loaded whole). */
@Component({
  selector: 'app-account-list',
  imports: [
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-list.component.html',
})
export class AccountListComponent implements OnInit {
  private readonly api = inject(AccountService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly accounts = signal<Account[]>([]);
  readonly loading = signal(true);
  readonly error = signal<AppError | null>(null);
  readonly search = signal('');
  readonly type = signal<AccountType | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly typeOptions = ACCOUNT_TYPES.map((type) => ({ value: type, label: `accounting.accountTypes.${type}` }));

  /** Filtering keeps the tree order; while filtering, matches are listed without indentation. */
  readonly rows = computed(() => {
    const term = this.search().trim().toLowerCase();
    const type = this.type();
    const tree = toTree(this.accounts());
    if (!term && !type) {
      return tree;
    }
    return tree
      .filter((row) => (!type || row.account_type === type) && (!term || row.code.startsWith(term) || row.name.toLowerCase().includes(term)))
      .map((row) => ({ ...row, depth: 0 }));
  });

  readonly headerActions: PageHeaderAction[] = [
    { label: 'accounting.accounts.addDefaults', icon: 'pi pi-sync', severity: 'secondary', onClick: () => this.addDefaults() },
    { label: 'accounting.accounts.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/accounting/accounts/new']) },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.all().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  typeSeverity(type: AccountType) {
    return ACCOUNT_TYPE_SEVERITY[type] ?? 'secondary';
  }

  edit(row: Account): void {
    void this.router.navigate(['/accounting/accounts', row.id, 'edit']);
  }

  confirmDelete(row: Account): void {
    this.confirm.confirmDelete(`${row.code} ${row.name}`, () => this.api.remove(row.id), () => this.load());
  }

  private addDefaults(): void {
    this.confirm.confirmAction({
      message: 'accounting.confirm.addDefaults',
      accept: 'accounting.accounts.addDefaults',
      success: 'accounting.toasts.defaultsChecked',
      run: () => this.api.setup(),
      onDone: () => this.load(),
    });
  }
}
