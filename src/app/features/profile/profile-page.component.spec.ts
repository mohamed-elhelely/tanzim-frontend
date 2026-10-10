import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { ProfilePageComponent } from './profile-page.component';
import { MeProfile } from './profile.service';

const URL = '/api/company/v1/me/profile/';
const PASSWORD_URL = '/api/company/v1/me/change-password/';

const PROFILE: MeProfile = {
  first_name: 'Sara',
  middle_name: '',
  last_name: 'Ali',
  preferred_name: '',
  phone_number: '+201001234567',
  timezone: 'Africa/Cairo',
  profile_picture: null,
};

describe('ProfilePageComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({ imports: [ProfilePageComponent], providers: [...provideApiTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    // No GET exists: an empty PATCH answers with the current profile.
    const load = httpMock.expectOne((r) => r.url === URL && r.method === 'PATCH');
    expect(load.request.body).toEqual({});
    load.flush(envelope(PROFILE));
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('fills the form and saves the details as JSON', () => {
    const fixture = setup();
    expect(fixture.componentInstance.form.getRawValue().phone_number).toBe('+201001234567');
    fixture.componentInstance.form.patchValue({ preferred_name: ' Sasa ' });
    fixture.componentInstance.save();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'PATCH');
    // No picture change: profile_picture is left out.
    const { profile_picture: _, ...details } = PROFILE;
    expect(req.request.body).toEqual({ ...details, preferred_name: 'Sasa' });
    req.flush(envelope({ ...PROFILE, preferred_name: 'Sasa' }));
  });

  it('uploads a new picture as multipart', () => {
    const fixture = setup();
    fixture.componentInstance.onPicture(new File(['x'], 'me.png', { type: 'image/png' }));
    fixture.componentInstance.save();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'PATCH');
    expect(req.request.body instanceof FormData).toBeTrue();
    expect((req.request.body as FormData).get('profile_picture')).toEqual(jasmine.any(File));
    req.flush(envelope({ ...PROFILE, profile_picture: 'http://x/media/me.png' }));
  });

  it('removes the picture with null', () => {
    const fixture = setup();
    fixture.componentInstance.onPicture(null);
    fixture.componentInstance.save();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'PATCH');
    expect(req.request.body.profile_picture).toBeNull();
    req.flush(envelope(PROFILE));
  });

  it('checks the confirmation, then shows the server error under the current password', () => {
    const fixture = setup();
    const form = fixture.componentInstance.passwordForm;
    form.setValue({ current_password: 'wrong', new_password: 'n3w-Secret!', confirm_password: 'other' });
    fixture.componentInstance.changePassword();
    httpMock.expectNone(PASSWORD_URL);
    expect(form.hasError('mismatch')).toBeTrue();

    form.patchValue({ confirm_password: 'n3w-Secret!' });
    fixture.componentInstance.changePassword();
    const req = httpMock.expectOne(PASSWORD_URL);
    expect(req.request.body).toEqual({ current_password: 'wrong', new_password: 'n3w-Secret!' });
    req.flush(errorEnvelope(400, 'Invalid', { current_password: ['Current password is incorrect.'] }), {
      status: 400,
      statusText: 'Bad Request',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Current password is incorrect.');
  });
});
