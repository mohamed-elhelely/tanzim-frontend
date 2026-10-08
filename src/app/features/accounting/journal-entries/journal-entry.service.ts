import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { JournalEntry, JournalEntryPayload } from '../accounting.models';

/**
 * Journal entries. Manual entries start as drafts (or are posted on save with `post: true`); posted entries are
 * final and corrected by reversing them. Automatic entries come from sales, stock and payments.
 */
@Injectable({ providedIn: 'root' })
export class JournalEntryService extends CrudApi<JournalEntry, JournalEntryPayload> {
  protected readonly path = 'accounting/v1/journal-entries/';

  postEntry(id: number): Observable<JournalEntry> {
    return this.post<JournalEntry>(`${this.detailPath(id)}post/`, {}).pipe(map((response) => response.data as JournalEntry));
  }

  /** Creates the mirror entry (dated today unless given) and returns it. */
  reverse(id: number, date: string | null, description: string): Observable<JournalEntry> {
    const body: Record<string, string> = {};
    if (date) {
      body['date'] = date;
    }
    if (description) {
      body['description'] = description;
    }
    return this.post<JournalEntry>(`${this.detailPath(id)}reverse/`, body).pipe(map((response) => response.data as JournalEntry));
  }
}
