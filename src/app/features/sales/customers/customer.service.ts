import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { Customer, CustomerListItem, CustomerPayload } from '../sales.models';

/**
 * Customers. The list returns a shorter shape (CustomerListItem) than retrieve (Customer, via `detail()`).
 * There's no `?dropdown=true`, and the list is only paginated when `page` is sent, so `all()` returns everyone.
 */
@Injectable({ providedIn: 'root' })
export class CustomerService extends CrudApi<CustomerListItem, CustomerPayload, Customer> {
  protected readonly path = 'sales/customers/';

  detail(id: number): Observable<Customer> {
    return this.get<Customer>(this.detailPath(id)).pipe(map((response) => response.data as Customer));
  }
}
