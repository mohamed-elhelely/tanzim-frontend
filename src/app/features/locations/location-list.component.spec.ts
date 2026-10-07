import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { makeLocation } from '../../testing/location-fixtures';
import { LocationListComponent } from './location-list.component';

const URL = '/api/company/v1/location/';

describe('LocationListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationListComponent],
      providers: provideApiTesting(),
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(LocationListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page and shows code, city and address', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('page_size')).toBe('10');
    req.flush(envelope([makeLocation()], 1));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Head Office');
    expect(text).toContain('HQ-01');
    expect(text).toContain('Cairo');
    expect(text).toContain('12 Abbas El Akkad St, Nasr City');
    expect(text).toContain('locations.types.office');
  });

  it('falls back to address line 1 when the backend omits full_address', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeLocation({ full_address: undefined })], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('12 Abbas El Akkad St');
  });

  it('searches after typing stops', async () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.onSearch(' office ');
    await new Promise((resolve) => setTimeout(resolve, 350));
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('search')).toBe('office');
    req.flush(envelope([], 0));
  });

  it('shows the forbidden state when the subscription has no Locations module', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.componentInstance.error()?.status).toBe(403);
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('opens the edit page', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeLocation()], 1));
    fixture.componentInstance.edit(makeLocation());
    expect(router.navigate).toHaveBeenCalledWith(['/locations', 4, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeLocation()], 1));
    fixture.componentInstance.confirmDelete(makeLocation());
    httpMock.expectOne(`${URL}4/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });
});
