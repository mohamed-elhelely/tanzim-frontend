import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../../core/api/base-api.service';
import { CompanyProfile } from '../company.models';

export interface CompanyProfileChanges {
  primary_color?: string;
  secondary_color?: string;
  /** A File uploads a new logo, null removes it. */
  logo?: File | null;
}

/** GET/PATCH /api/company/v1/company-profile/: the caller's company branding (view_company / change_company). */
@Injectable({ providedIn: 'root' })
export class CompanyProfileService extends BaseApiService {
  private readonly path = 'company/v1/company-profile/';

  load(): Observable<CompanyProfile> {
    return this.get<CompanyProfile>(this.path).pipe(map((response) => response.data as CompanyProfile));
  }

  /** A new logo goes as multipart; otherwise JSON (so `logo: null` removes it). */
  update(changes: CompanyProfileChanges): Observable<CompanyProfile> {
    let body: CompanyProfileChanges | FormData = changes;
    if (changes.logo instanceof File) {
      const form = new FormData();
      for (const [key, value] of Object.entries(changes)) {
        form.append(key, value as string | Blob);
      }
      body = form;
    }
    return this.patch<CompanyProfile>(this.path, body).pipe(map((response) => response.data as CompanyProfile));
  }
}
