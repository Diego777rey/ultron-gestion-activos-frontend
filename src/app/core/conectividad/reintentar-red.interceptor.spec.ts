import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { reintentarRedInterceptor } from './reintentar-red.interceptor';

describe('reintentarRedInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([reintentarRedInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reintenta una vez ante status 0 y luego propaga el error', async () => {
    vi.useFakeTimers();

    let finalStatus = -1;
    http.get('/api/test').subscribe({
      error: (err: HttpErrorResponse) => {
        finalStatus = err.status;
      },
    });

    const first = httpMock.expectOne('/api/test');
    first.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    await vi.advanceTimersByTimeAsync(500);

    const second = httpMock.expectOne('/api/test');
    second.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(finalStatus).toBe(0);
    vi.useRealTimers();
  });

  it('no reintenta errores HTTP con código', () => {
    http.get('/api/test').subscribe({
      error: (err: HttpErrorResponse) => expect(err.status).toBe(503),
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('down', { status: 503, statusText: 'Service Unavailable' });
  });
});
