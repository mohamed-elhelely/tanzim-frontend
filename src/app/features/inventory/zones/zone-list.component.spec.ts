import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeZone } from '../../../testing/inventory-fixtures';
import { ZoneListComponent } from './zone-list.component';
import { EMPTY } from 'rxjs';
import { FormDialogService } from '../../../shared/forms/form-dialog.service';
import { ZoneFormComponent } from './zone-form.component';

const URL = '/api/inventory/v1/zone/';

describe('ZoneListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ZoneListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('loads the first page and shows rows', () => {
    const fixture = TestBed.createComponent(ZoneListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeZone()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Zone A');
    expect(fixture.nativeElement.textContent).toContain('Main WH');
  });

  it('opens the edit form in a dialog', () => {
    const fixture = TestBed.createComponent(ZoneListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.has('page')).flush(envelope([], 0));
    const open = spyOn(TestBed.inject(FormDialogService), 'open').and.returnValue(EMPTY);
    fixture.componentInstance.edit(makeZone({ id: 4 }));
    expect(open).toHaveBeenCalledWith(ZoneFormComponent, { header: 'inventory.zones.edit', id: 4 });
  });
});
