import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeZone } from '../../../testing/inventory-fixtures';
import { ZoneListComponent } from './zone-list.component';

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
    httpMock.expectOne((r) => r.url === URL && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'x', code: 'C-1' }]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Zone A');
    expect(fixture.nativeElement.textContent).toContain('Main WH');
  });

  it('opens the edit page', () => {
    const fixture = TestBed.createComponent(ZoneListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.has('page')).flush(envelope([], 0));
    httpMock.expectOne((r) => r.url === URL && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'x', code: 'C-1' }]));
    fixture.componentInstance.edit(makeZone({ id: 4 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/inventory/zones', 4, 'edit']);
  });
});
