import { TestBed } from '@angular/core/testing';

import { DEFAULT_TOAST_DURATION_MS, MAX_VISIBLE_TOASTS, ToastService } from './toast.service';

describe('ToastService', () => {
  let toasts: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  const messages = () => toasts.toasts().map((t) => t.message);

  it('shows and dismisses toasts', () => {
    const id = toasts.show({ message: 'Saved', tone: 'success' })!;
    expect(messages()).toEqual(['Saved']);
    toasts.dismiss(id);
    expect(messages()).toEqual([]);
  });

  it('does not stack toasts that share a key', () => {
    toasts.show({ message: 'Offline', key: 'net' });
    expect(toasts.show({ message: 'Offline', key: 'net' })).toBeNull();
    expect(messages()).toEqual(['Offline']);
  });

  it('shows only the most recent toasts', () => {
    for (let i = 1; i <= MAX_VISIBLE_TOASTS + 2; i++) toasts.show({ message: `#${i}` });
    expect(messages()).toEqual(['#3', '#4', '#5']);
  });

  it('auto-dismisses non-error toasts', () => {
    toasts.show({ message: 'Hello' });
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS - 1);
    expect(messages()).toEqual(['Hello']);
    vi.advanceTimersByTime(1);
    expect(messages()).toEqual([]);
  });

  it('keeps errors until the user dismisses them', () => {
    toasts.show({ message: 'Failed', tone: 'error' });
    vi.advanceTimersByTime(60_000);
    expect(messages()).toEqual(['Failed']);
  });

  it('pauses countdowns and resumes with the remaining time', () => {
    toasts.show({ message: 'Hello' });
    vi.advanceTimersByTime(3000);

    toasts.pause();
    vi.advanceTimersByTime(60_000);
    expect(messages()).toEqual(['Hello']);

    toasts.resume();
    vi.advanceTimersByTime(1999);
    expect(messages()).toEqual(['Hello']);
    vi.advanceTimersByTime(1);
    expect(messages()).toEqual([]);
  });

  it('starts paused countdowns only on resume', () => {
    toasts.pause();
    toasts.show({ message: 'Hello' });
    vi.advanceTimersByTime(60_000);
    expect(messages()).toEqual(['Hello']);
    toasts.resume();
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS);
    expect(messages()).toEqual([]);
  });
});
