import { TestBed } from '@angular/core/testing';

import { Paginator } from './paginator';

describe('Paginator', () => {
  async function render(page: number, pageSize: number, total: number) {
    const fixture = TestBed.createComponent(Paginator);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('pageSize', pageSize);
    fixture.componentRef.setInput('total', total);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    return { fixture, el, button };
  }

  it('describes the visible range', async () => {
    const { el } = await render(3, 25, 2000);
    expect(el.textContent?.replace(/\s+/g, ' ')).toContain('Showing 51–75 of 2,000');
    expect(el.textContent).toContain('Page 3 of 80');
  });

  it('caps the range on the last page', async () => {
    const { el } = await render(5, 10, 42);
    expect(el.textContent?.replace(/\s+/g, ' ')).toContain('Showing 41–42 of 42');
  });

  it('disables the buttons that would leave the range', async () => {
    const first = await render(1, 25, 100);
    expect(first.button('Previous page').disabled).toBe(true);
    expect(first.button('Next page').disabled).toBe(false);

    const last = await render(4, 25, 100);
    expect(last.button('Next page').disabled).toBe(true);
    expect(last.button('Last page').disabled).toBe(true);
  });

  it('emits page and page-size intents', async () => {
    const { fixture, el, button } = await render(2, 25, 100);
    const pages: number[] = [];
    const sizes: number[] = [];
    fixture.componentInstance.pageChange.subscribe((p) => pages.push(p));
    fixture.componentInstance.pageSizeChange.subscribe((s) => sizes.push(s));

    button('Next page').click();
    button('Last page').click();
    const select = el.querySelector('select')!;
    select.value = '50';
    select.dispatchEvent(new Event('change'));

    expect(pages).toEqual([3, 4]);
    expect(sizes).toEqual([50]);
  });

  it('says so when there are no results', async () => {
    const { el } = await render(1, 25, 0);
    expect(el.textContent).toContain('No results');
  });
});
