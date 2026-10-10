import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AccessService } from '../../../core/auth/access.service';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { CompanyProfile } from '../company.models';
import { CompanyProfileComponent } from './company-profile.component';

const URL = '/api/company/v1/company-profile/';
const COMPANY: CompanyProfile = { id: 1, name: 'Acme', logo: null, primary_color: '#0B5FFF', secondary_color: '#FFFFFF' };

describe('CompanyProfileComponent', () => {
  let httpMock: HttpTestingController;

  function setup(canChange: boolean) {
    TestBed.configureTestingModule({
      imports: [CompanyProfileComponent],
      providers: [
        ...provideApiTesting(),
        { provide: AccessService, useValue: { can: () => canChange, update: jasmine.createSpy('update') } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CompanyProfileComponent);
    fixture.detectChanges();
    httpMock.expectOne(URL).flush(envelope(COMPANY));
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('saves upper-case colors and updates the branding in /me', () => {
    const fixture = setup(true);
    fixture.componentInstance.form.patchValue({ primary_color: '#112233' });
    fixture.componentInstance.save();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'PATCH');
    expect(req.request.body).toEqual({ primary_color: '#112233', secondary_color: '#FFFFFF' });
    req.flush(envelope({ ...COMPANY, primary_color: '#112233' }));
    expect(TestBed.inject(AccessService).update).toHaveBeenCalled();
  });

  it('refuses an invalid color', () => {
    const fixture = setup(true);
    fixture.componentInstance.form.patchValue({ secondary_color: 'blue' });
    fixture.componentInstance.save();
    httpMock.expectNone((r) => r.method === 'PATCH');
    // The preview keeps the saved color.
    expect(fixture.componentInstance.secondary()).toBe('#FFFFFF');
  });

  it('is read-only without change_company', () => {
    const fixture = setup(false);
    expect(fixture.componentInstance.form.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('button[type=submit]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type=file]')).toBeNull();
  });
});
