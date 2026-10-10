import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeBin } from '../../../testing/inventory-fixtures';
import { BinListComponent } from './bin-list.component';
import { EMPTY } from 'rxjs';
import { FormDialogService } from '../../../shared/forms/form-dialog.service';
import { BinFormComponent } from './bin-form.component';

const URL = '/api/inventory/v1/bin/';

describe('BinListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BinListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('loads the first page and shows rows', () => {
    const fixture = TestBed.createComponent(BinListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeBin()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Zone A');
    expect(fixture.nativeElement.textContent).toContain('Bin 1');
  });

  it('opens the edit form in a dialog', () => {
    const fixture = TestBed.createComponent(BinListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.has('page')).flush(envelope([], 0));
    const open = spyOn(TestBed.inject(FormDialogService), 'open').and.returnValue(EMPTY);
    fixture.componentInstance.edit(makeBin({ id: 4 }));
    expect(open).toHaveBeenCalledWith(BinFormComponent, { header: 'inventory.bins.edit', id: 4 });
  });
});
