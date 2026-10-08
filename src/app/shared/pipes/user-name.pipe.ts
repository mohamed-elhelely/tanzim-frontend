import { Pipe, PipeTransform } from '@angular/core';

export interface UserLike {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

/** Display name for any user-shaped object: full name, else first + last, else email. */
export function userName(user: UserLike | null | undefined): string {
  if (!user) {
    return '';
  }
  const name = user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || user.email || '';
}

@Pipe({ name: 'userName', standalone: true })
export class UserNamePipe implements PipeTransform {
  transform(user: UserLike | null | undefined): string {
    return userName(user);
  }
}
