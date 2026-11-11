import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  it('renders the router outlet', () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('router-outlet')).not.toBeNull();
  });
});
