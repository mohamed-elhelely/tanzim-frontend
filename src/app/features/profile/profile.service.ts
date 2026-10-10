import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../core/api/base-api.service';

/** PATCH /api/company/v1/me/profile/ request and response. */
export interface MeProfile {
  first_name: string;
  middle_name: string;
  last_name: string;
  preferred_name: string;
  phone_number: string;
  timezone: string;
  /** Absolute URL or null in responses. */
  profile_picture: string | null;
}

export type MeProfileChanges = Partial<Omit<MeProfile, 'profile_picture'>> & { profile_picture?: File | null };

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

/** The signed-in user's own profile and password (any authenticated user; no permission needed). */
@Injectable({ providedIn: 'root' })
export class ProfileService extends BaseApiService {
  private readonly path = 'company/v1/me/profile/';

  /**
   * There is no GET for the profile (BACKEND_REQUESTS.md item 29): an empty PATCH changes nothing and answers
   * with every field, so the form can show the middle name, phone and timezone too.
   */
  load(): Observable<MeProfile> {
    return this.patch<MeProfile>(this.path, {}).pipe(map((response) => response.data as MeProfile));
  }

  /** A new picture goes as multipart; otherwise JSON (so `profile_picture: null` removes it). */
  update(changes: MeProfileChanges): Observable<MeProfile> {
    const picture = changes.profile_picture;
    let body: MeProfileChanges | FormData = changes;
    if (picture instanceof File) {
      const form = new FormData();
      for (const [key, value] of Object.entries(changes)) {
        form.append(key, value as string | Blob);
      }
      body = form;
    }
    return this.patch<MeProfile>(this.path, body).pipe(map((response) => response.data as MeProfile));
  }

  changePassword(body: ChangePasswordPayload): Observable<void> {
    return this.post<unknown>('company/v1/me/change-password/', body).pipe(map(() => undefined));
  }
}
