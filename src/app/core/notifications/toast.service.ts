import { computed, Service, signal } from '@angular/core';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  /** Toasts sharing a key are not stacked: a second one is ignored while the first is visible. */
  key?: string;
  /** Override auto-dismiss (ms). `null` = stays until dismissed. Errors default to `null`. */
  durationMs?: number | null;
}

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  key: string | undefined;
}

interface Timer {
  remainingMs: number;
  startedAt: number;
  handle: ReturnType<typeof setTimeout> | undefined;
}

export const DEFAULT_TOAST_DURATION_MS = 5000;
export const MAX_VISIBLE_TOASTS = 3;

/**
 * App-wide notifications. Accessibility rules baked in:
 * - errors never auto-dismiss (WCAG 2.2.1 Timing Adjustable);
 * - auto-dismiss timers pause while the user hovers or focuses the toast region.
 */
@Service()
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, Timer>();
  private paused = false;
  private readonly items = signal<readonly Toast[]>([]);

  readonly toasts = computed(() => this.items().slice(-MAX_VISIBLE_TOASTS));

  show({ message, tone = 'info', key, durationMs }: ToastOptions): number | null {
    if (key && this.items().some((t) => t.key === key)) return null;

    const id = this.nextId++;
    this.items.update((list) => [...list, { id, message, tone, key }]);

    const duration =
      durationMs !== undefined ? durationMs : tone === 'error' ? null : DEFAULT_TOAST_DURATION_MS;
    if (duration !== null) {
      this.timers.set(id, { remainingMs: duration, startedAt: 0, handle: undefined });
      if (!this.paused) this.startTimer(id);
    }
    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer?.handle) clearTimeout(timer.handle);
    this.timers.delete(id);
    this.items.update((list) => list.filter((t) => t.id !== id));
  }

  /** Freeze every auto-dismiss countdown (pointer or focus inside the toast region). */
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    for (const timer of this.timers.values()) {
      if (!timer.handle) continue;
      clearTimeout(timer.handle);
      timer.handle = undefined;
      timer.remainingMs -= Date.now() - timer.startedAt;
    }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    for (const id of this.timers.keys()) this.startTimer(id);
  }

  private startTimer(id: number): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => this.dismiss(id), Math.max(0, timer.remainingMs));
  }
}
