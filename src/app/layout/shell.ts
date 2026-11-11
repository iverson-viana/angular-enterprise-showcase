import { Component, type ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';

import { TranslatePipe } from '../core/i18n/translate.pipe';
import { Icon } from '../shared/ui/icon';
import { SidebarNav } from './sidebar-nav';
import { Topbar } from './topbar';

/**
 * Authenticated app frame: persistent sidebar on desktop, modal drawer on mobile
 * (native <dialog>: focus trap, Esc to close and inert background for free).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarNav, Topbar, Icon, TranslatePipe],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly drawer = viewChild.required<ElementRef<HTMLDialogElement>>('drawer');
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    // After navigating to another page: close the mobile drawer and move focus to the new
    // content so keyboard and screen-reader users start at the top of the page.
    // Query-only changes (filters synced to the URL) keep focus where the user is.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects.split(/[?#]/)[0]),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.closeDrawer();
        this.main().nativeElement.focus();
      });
  }

  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  protected openDrawer(): void {
    this.drawer().nativeElement.showModal();
  }

  protected closeDrawer(): void {
    const drawer = this.drawer().nativeElement;
    if (drawer.open) drawer.close();
  }

  /** Light dismiss: a click on the ::backdrop targets the <dialog> element itself. */
  protected onDrawerClick(event: MouseEvent): void {
    if (event.target === this.drawer().nativeElement) this.closeDrawer();
  }
}
