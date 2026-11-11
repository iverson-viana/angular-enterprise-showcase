import { TestBed } from '@angular/core/testing';

import { ToastOutlet } from './toast-outlet';
import { ToastService } from './toast.service';

describe('ToastOutlet', () => {
  async function setup() {
    const fixture = TestBed.createComponent(ToastOutlet);
    const toasts = TestBed.inject(ToastService);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, toasts, el };
  }

  it('has both live regions in place before any toast appears', async () => {
    const { el } = await setup();
    expect(el.querySelector('[aria-live="assertive"]')).not.toBeNull();
    expect(el.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('routes errors to the assertive region and the rest to the polite one', async () => {
    const { fixture, toasts, el } = await setup();
    toasts.show({ message: 'Server unreachable', tone: 'error' });
    toasts.show({ message: 'Signed out', tone: 'success' });
    await fixture.whenStable();

    expect(el.querySelector('[aria-live="assertive"]')?.textContent).toContain(
      'Server unreachable',
    );
    expect(el.querySelector('[aria-live="polite"]')?.textContent).toContain('Signed out');
    expect(el.querySelector('[aria-live="polite"]')?.textContent).not.toContain('Server');
  });

  it('dismisses a toast from its close button', async () => {
    const { fixture, toasts, el } = await setup();
    toasts.show({ message: 'Failed', tone: 'error' });
    await fixture.whenStable();

    el.querySelector<HTMLButtonElement>('button[aria-label="Dismiss notification"]')!.click();
    await fixture.whenStable();
    expect(toasts.toasts()).toEqual([]);
    expect(el.textContent).not.toContain('Failed');
  });
});
