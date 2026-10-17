import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { duplicateWriteInterceptor } from './duplicate-write.interceptor';

describe('duplicateWriteInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([duplicateWriteInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('drops the same write while the first is waiting, and allows it again once answered', () => {
    const first = jasmine.createSpy('first');
    const repeat = { next: jasmine.createSpy('next'), error: jasmine.createSpy('error'), complete: jasmine.createSpy('complete') };
    http.post('/api/brands/', { name: 'ErgoSeat' }).subscribe(first);
    http.post('/api/brands/', { name: 'ErgoSeat' }).subscribe(repeat);

    // The repeat completes quietly: no response, no error.
    expect(repeat.complete).toHaveBeenCalled();
    expect(repeat.next).not.toHaveBeenCalled();
    expect(repeat.error).not.toHaveBeenCalled();
    httpMock.expectOne('/api/brands/').flush({ id: 1 });
    expect(first).toHaveBeenCalledWith({ id: 1 });

    http.post('/api/brands/', { name: 'ErgoSeat' }).subscribe();
    httpMock.expectOne('/api/brands/').flush({ id: 2 });
  });

  it('lets different writes go out together (bulk delete, other bodies)', () => {
    http.delete('/api/brands/1/').subscribe();
    http.delete('/api/brands/2/').subscribe();
    http.patch('/api/brands/1/', { name: 'A' }).subscribe();
    http.patch('/api/brands/1/', { name: 'B' }).subscribe();
    expect(httpMock.match(() => true).length).toBe(4);
  });

  it('never holds back reads', () => {
    http.get('/api/brands/').subscribe();
    http.get('/api/brands/').subscribe();
    expect(httpMock.match('/api/brands/').length).toBe(2);
  });

  it('releases the write when it fails, so the user can try again', () => {
    http.put('/api/brands/1/', { name: 'A' }).subscribe({ error: () => undefined });
    httpMock.expectOne('/api/brands/1/').flush({}, { status: 500, statusText: 'Server Error' });
    http.put('/api/brands/1/', { name: 'A' }).subscribe();
    httpMock.expectOne('/api/brands/1/').flush({});
  });

  it('compares uploads by their fields and files', () => {
    const form = () => {
      const data = new FormData();
      data.append('name', 'ErgoSeat');
      data.append('logo', new File(['x'], 'logo.png', { type: 'image/png', lastModified: 1 }));
      return data;
    };
    http.patch('/api/brands/1/', form()).subscribe();
    http.patch('/api/brands/1/', form()).subscribe();
    httpMock.expectOne('/api/brands/1/').flush({});
  });
});
