import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ToastService } from '../notifications/toast.service';
import { AppErrorHandler } from './app-error-handler';

describe('AppErrorHandler', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useClass: AppErrorHandler }],
    });
  });

  it('logs the error and tells the user once', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = TestBed.inject(ErrorHandler);
    const toasts = TestBed.inject(ToastService);
    const boom = new Error('boom');

    handler.handleError(boom);
    handler.handleError(new Error('again'));

    expect(log).toHaveBeenCalledWith(boom);
    expect(toasts.toasts()).toHaveLength(1);
    expect(toasts.toasts()[0]).toMatchObject({ tone: 'error' });
    log.mockRestore();
  });
});
