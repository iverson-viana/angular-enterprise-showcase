import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../notifications/toast.service';
import { errorNotificationInterceptor, SILENT_HTTP_ERRORS } from './error-notification.interceptor';

describe('errorNotificationInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let toasts: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorNotificationInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => http.verify());

  async function fail(status: number, context?: HttpContext) {
    const result = firstValueFrom(client.get('/api/x', { context }));
    const req = http.expectOne('/api/x');
    if (status === 0) req.error(new ProgressEvent('error'));
    else req.flush(null, { status, statusText: 'Error' });
    // The error always reaches the caller.
    await expect(result).rejects.toMatchObject({ status });
  }

  it('reports network failures', async () => {
    await fail(0);
    expect(toasts.toasts()).toMatchObject([{ tone: 'error', key: 'network-error' }]);
  });

  it('reports permission errors', async () => {
    await fail(403);
    expect(toasts.toasts()).toMatchObject([{ tone: 'warning', key: 'forbidden' }]);
  });

  it('leaves other errors to the page (no double reporting)', async () => {
    await fail(500);
    await fail(404);
    expect(toasts.toasts()).toEqual([]);
  });

  it('can be silenced per request', async () => {
    await fail(0, new HttpContext().set(SILENT_HTTP_ERRORS, true));
    expect(toasts.toasts()).toEqual([]);
  });
});
