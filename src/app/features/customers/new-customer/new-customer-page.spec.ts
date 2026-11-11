import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';

import { ToastService } from '../../../core/notifications/toast.service';
import { toCreateRequest } from './new-customer.models';
import { NAME_AVAILABILITY_API } from './new-customer.schema';
import { validDraft } from './new-customer.testing';
import { CUSTOMERS_API, NewCustomerPage } from './new-customer-page';

describe('NewCustomerPage', () => {
  let http: HttpTestingController;
  let navigate: MockInstance<Router['navigate']>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    // Debounced availability checks may or may not have fired; they're covered by the schema spec.
    http.match((r) => r.url === NAME_AVAILABILITY_API).forEach((r) => r.flush({ available: true }));
    http.verify();
    document.body.replaceChildren();
  });

  async function render() {
    const fixture = TestBed.createComponent(NewCustomerPage);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const query = <T extends Element = HTMLInputElement>(selector: string) => {
      const found = el.querySelector<T>(selector);
      if (!found) throw new Error(`Not found: ${selector}`);
      return found;
    };
    const type = async (selector: string, value: string) => {
      const input = query(selector);
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    };
    const choose = async (selector: string, value: string) => {
      const select = query<HTMLSelectElement>(selector);
      select.value = value;
      select.dispatchEvent(new Event('input'));
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const click = async (selector: string) => {
      query<HTMLElement>(selector).click();
      await fixture.whenStable();
    };
    const submit = () => click('button[type="submit"]');

    /** Fills the form exactly like `validDraft()`. */
    const fillValid = async () => {
      const d = validDraft();
      await type('#legal-name', d.company.legalName);
      await choose('#segment', d.company.segment);
      await choose('#country', d.company.country);
      await type('#tax-id', d.company.taxId);
      await type('#iban', d.banking.iban);
      await type('#monthly-volume', String(d.banking.monthlyVolume));
      await type('#credit-limit', String(d.banking.creditLimit));
      await type('#signatory-0-name', d.signatories[0].name);
      await type('#signatory-0-email', d.signatories[0].email);
      await click('#kyc');
    };

    return { fixture, el, query, type, choose, click, submit, fillValid };
  }

  const createRequest = () => http.expectOne((r) => r.method === 'POST' && r.url === CUSTOMERS_API);

  it('on an invalid submit, shows a focused error summary that links to each field', async () => {
    const { el, query, submit, click } = await render();
    await submit();

    const summary = query<HTMLElement>('[aria-labelledby="error-summary-title"]');
    expect(document.activeElement).toBe(summary);
    expect(summary.textContent).toContain('There are 8 problems with this form');
    expect(el.querySelector('#legal-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#legal-name')?.getAttribute('aria-describedby')).toContain(
      'legal-name-error',
    );

    await click('[aria-labelledby="error-summary-title"] li button');
    expect(document.activeElement?.id).toBe('legal-name');
  });

  it('masks the tax ID per country and clears it when the country changes', async () => {
    const { query, choose, type } = await render();
    expect(query('#tax-id').disabled).toBe(true);

    await choose('#country', 'BR');
    await type('#tax-id', '12abc34501de35');
    expect(query('#tax-id').value).toBe('12.ABC.345/01DE-35');

    await choose('#country', 'PT');
    expect(query('#tax-id').value).toBe('');
  });

  it('shows routing and account number instead of IBAN for US companies', async () => {
    const { el, choose } = await render();
    await choose('#country', 'US');
    expect(el.querySelector('#iban')).toBeNull();
    expect(el.querySelector('#routing-number')).not.toBeNull();
    expect(el.querySelector('#account-number')).not.toBeNull();
  });

  it('creates the customer, confirms it and opens the list filtered by the new id', async () => {
    const { fixture, fillValid, submit } = await render();
    await fillValid();
    await submit();

    const req = createRequest();
    expect(req.request.body).toEqual(toCreateRequest(validDraft()));
    req.flush({ id: 'C-12001', name: 'Quarrytide Holdings S.A.' }, { status: 201, statusText: '' });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/customers'], { queryParams: { q: 'C-12001' } });
    expect(TestBed.inject(ToastService).toasts()).toMatchObject([{ tone: 'success' }]);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('maps a server-side name conflict back onto the legal name field', async () => {
    const { fixture, query, fillValid, submit } = await render();
    await fillValid();
    await submit();

    createRequest().flush(
      {
        message: 'Conflict',
        fieldErrors: { legalName: 'A customer with this legal name already exists.' },
      },
      { status: 409, statusText: 'Conflict' },
    );
    // The submit action settles a few microtasks after the response.
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(query('#legal-name-error').textContent).toContain('already exists');
    });
    expect(document.activeElement).toBe(query('[aria-labelledby="error-summary-title"]'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('adds and removes signatories, moving focus predictably', async () => {
    const { el, click } = await render();
    expect(el.querySelector('[aria-label="Remove signatory 1"]')).toBeNull();

    await click('fieldset ol + button');
    expect(document.activeElement?.id).toBe('signatory-1-name');

    await click('[aria-label="Remove signatory 2"]');
    expect(el.querySelector('#signatory-1-name')).toBeNull();
    expect(document.activeElement?.textContent).toContain('Add signatory');
  });

  it('tracks unsaved changes for the leave-page guard', async () => {
    const { fixture, type } = await render();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    await type('#legal-name', 'Draft Co');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });
});
