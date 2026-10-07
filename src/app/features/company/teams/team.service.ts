import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Team, TeamPayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class TeamService extends CrudApi<Team, TeamPayload> {
  protected readonly path = 'company/v1/teams/';
}
