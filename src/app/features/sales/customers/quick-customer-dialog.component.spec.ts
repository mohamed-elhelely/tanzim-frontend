import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCustomer } from '../../../testing/sales-fixtures';
import { QuickCustomerDialogComponent } from './quick-customer-dialog.component';

const URL = '/api/sales/customers/';

describe('QuickCustomerDialogComponent', () => {
  let httpMock: HttpTestingController;
  let close: jasmine.Spy;

  function setup() {
    close = jasmine.createSpy('close');
    TestBed.configureTestingModule({
      imports: [QuickCustomerDialogComponent],
      providers: [...provideApiTesting(), { provide: DynamicDialogRef, useValue: { close } }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(QuickCustomerDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  afterEach(() => httpMock.verify());

  it('needs a name and a phone number (spaces do not count)', () => {
    const component = setup();
    component.form.setValue({ name: '   ', phone: '' });
    component.submit();
    httpMock.expectNone(URL);
    expect(component.form.controls.name.hasError('required')).toBeTrue();
    expect(component.form.controls.phone.hasError('required')).toBeTrue();
  });

  it('creates the customer from the name and phone once, then closes with it', () => {
    const component = setup();
    component.form.setValue({ name: ' New Co ', phone: ' +966501234567 ' });
    component.submit();
    // A second press while saving sends nothing.
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name: 'New Co', phone: '+966501234567' });
    const created = makeCustomer({ id: 3, name: 'New Co' });
    req.flush(envelope(created), { status: 201, statusText: 'Created' });
    expect(close).toHaveBeenCalledWith(created);
    expect(component.saving()).toBeFalse();
  });

  it("shows the backend's field errors and stays open", () => {
    const component = setup();
    component.form.setValue({ name: 'New Co', phone: 'abc' });
    component.submit();
    httpMock
      .expectOne(URL)
      .flush(errorEnvelope(400, 'Validation failed', { phone: ['Enter a valid phone number.'] }), { status: 400, statusText: 'Bad Request' });
    expect(component.form.controls.phone.errors).toEqual(jasmine.objectContaining({ serverError: 'Enter a valid phone number.' }));
    expect(close).not.toHaveBeenCalled();
  });

  it('closes with nothing when cancelled', () => {
    setup().cancel();
    expect(close).toHaveBeenCalledWith();
  });
});
