import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { StockReservation } from '../inventory.models';

/** Stock reservations (read here). The API can't filter them, so open ones are picked out in the browser. */
@Injectable({ providedIn: 'root' })
export class StockReservationService extends CrudApi<StockReservation, never> {
  protected readonly path = 'inventory/v1/stock-reservation/';

  open(): Observable<StockReservation[]> {
    return this.listAll().pipe(map((reservations) => reservations.filter((reservation) => !reservation.is_released)));
  }
}
