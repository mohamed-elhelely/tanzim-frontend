import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LocalizedNamePipe } from '../../../shared/pipes/localized-name.pipe';
import { UserNamePipe } from '../../../shared/pipes/user-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Department } from '../company.models';
import { DepartmentService } from './department.service';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LocalizedNamePipe,
    UserNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './department-list.component.html',
})
export class DepartmentListComponent implements OnInit {
  private readonly api = inject(DepartmentService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly search$ = new Subject<string>();
  private searchTerm = '';
  private ordering?: string;

  readonly lang = inject(LanguageService).currentLang;
  readonly rows = signal<Department[]>([]);
  readonly total = signal(0);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.departments.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/departments/new']),
    },
  ];

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.searchTerm = term;
      this.first.set(0);
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    const field = typeof event.sortField === 'string' ? event.sortField : undefined;
    this.ordering = field ? `${event.sortOrder === -1 ? '-' : ''}${field}` : undefined;
    this.load();
  }

  onSearch(term: string): void {
    this.search$.next(term.trim());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        page: Math.floor(this.first() / this.pageSize()) + 1,
        pageSize: this.pageSize(),
        search: this.searchTerm || undefined,
        ordering: this.ordering,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  edit(row: Department): void {
    void this.router.navigate(['/company/departments', row.id, 'edit']);
  }

  confirmDelete(row: Department): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.name_en }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: Department): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('common.deleted'));
        if (this.rows().length === 1 && this.first() >= this.pageSize()) {
          this.first.update((first) => first - this.pageSize());
        }
        this.load();
      },
      error: (error: AppError) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
