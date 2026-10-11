import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { TableQuery } from './server-table';

export interface SavedView {
  name: string;
  query: TableQuery;
}

const PREFIX = 'tanzim.views';
const MAX_VIEWS = 20;

/**
 * Named search + filter sets per list screen, kept in this browser for the signed-in user.
 * Storage can be unavailable (private mode, blocked site data): reads then return nothing and saves are dropped.
 */
@Injectable({ providedIn: 'root' })
export class SavedViewsService {
  private readonly auth = inject(AuthService);

  list(screen: string): SavedView[] {
    try {
      const raw = localStorage.getItem(this.key(screen));
      const views = raw ? (JSON.parse(raw) as SavedView[]) : [];
      return Array.isArray(views) ? views.filter((view) => typeof view?.name === 'string' && view.query) : [];
    } catch {
      return [];
    }
  }

  /** Saves under `name`, replacing a view of the same name; newest first. */
  save(screen: string, name: string, query: TableQuery): SavedView[] {
    const views = [{ name, query }, ...this.list(screen).filter((view) => view.name !== name)].slice(0, MAX_VIEWS);
    this.write(screen, views);
    return views;
  }

  remove(screen: string, name: string): SavedView[] {
    const views = this.list(screen).filter((view) => view.name !== name);
    this.write(screen, views);
    return views;
  }

  private write(screen: string, views: SavedView[]): void {
    try {
      localStorage.setItem(this.key(screen), JSON.stringify(views));
    } catch {
      // Storage full or blocked: the view lasts until the page closes.
    }
  }

  /** Per user, so people sharing a browser keep their own views. */
  private key(screen: string): string {
    return `${PREFIX}.${this.auth.user()?.id ?? 'anonymous'}.${screen}`;
  }
}
