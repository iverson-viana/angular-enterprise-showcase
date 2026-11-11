import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import { emptyNewCustomer, type NewCustomerDraft } from './new-customer.models';
import {
  NAME_AVAILABILITY_API,
  NAME_CHECK_DEBOUNCE_MS,
  newCustomerSchema,
} from './new-customer.schema';
import { validDraft } from './new-customer.testing';

const messages = (errors: readonly { message?: string }[]) => errors.map((e) => e.message);

describe('newCustomerSchema', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function setup(draft: NewCustomerDraft) {
    const model = signal(draft);
    const tree = TestBed.runInInjectionContext(() => form(model, newCustomerSchema));
    return { model, tree };
  }

  it('reports every missing field of an empty draft, but not the tax ID before a country', () => {
    const { tree } = setup(emptyNewCustomer());

    expect(messages(tree().errorSummary())).toEqual([
      'Enter the legal name.',
      'Choose a segment.',
      'Choose a country.',
      'Enter the IBAN.',
      'Enter the expected monthly volume.',
      'Enter the full name.',
      'Enter the email address.',
      'Confirm the KYC documents were verified.',
    ]);
    expect(tree.company.taxId().disabled()).toBe(true);
  });

  it('accepts a complete, consistent draft', () => {
    const { tree } = setup(validDraft());
    expect(tree().errorSummary()).toEqual([]);
  });

  it('validates the tax ID with the rule of the selected country', () => {
    const { model, tree } = setup(validDraft());
    model.update((d) => ({ ...d, company: { ...d.company, taxId: '12ABC34501DE36' } }));
    expect(messages(tree.company.taxId().errors())).toEqual([
      'Enter a valid CNPJ, for example 12.ABC.345/01DE-35.',
    ]);

    model.update((d) => ({ ...d, company: { ...d.company, country: 'PT', taxId: '123456789' } }));
    expect(tree.company.taxId().errors()).toEqual([]);
  });

  it('swaps IBAN for ABA routing + account number in the US', () => {
    const { model, tree } = setup(validDraft());
    model.update((d) => ({ ...d, company: { ...d.company, country: 'US', taxId: '123456789' } }));

    expect(tree.banking.iban().hidden()).toBe(true);
    expect(messages(tree().errorSummary())).toEqual([
      'Enter the routing number.',
      'Enter the account number.',
    ]);

    model.update((d) => ({
      ...d,
      banking: { ...d.banking, routingNumber: '123456789', accountNumber: '12345678' },
    }));
    expect(messages(tree.banking.routingNumber().errors())).toEqual([
      'Enter a valid 9-digit ABA routing number.',
    ]);
  });

  it('requires the IBAN to belong to the company country', () => {
    const { model, tree } = setup(validDraft());
    model.update((d) => ({ ...d, banking: { ...d.banking, iban: 'GB82WEST12345698765432' } }));
    expect(messages(tree.banking.iban().errors())).toEqual(['The account must be held in Brazil.']);
  });

  it('caps the credit limit relative to the monthly volume (cross-field)', () => {
    const { model, tree } = setup(validDraft());
    model.update((d) => ({ ...d, banking: { ...d.banking, creditLimit: 800_000 } }));
    expect(messages(tree.banking.creditLimit().errors())).toEqual([
      "Credit limit can't exceed 3× the monthly volume ($750,000).",
    ]);

    // Raising the *other* field clears the error.
    model.update((d) => ({ ...d, banking: { ...d.banking, monthlyVolume: 300_000 } }));
    expect(tree.banking.creditLimit().errors()).toEqual([]);
  });

  it('flags repeated signatory emails on the repeated entry only', () => {
    const { model, tree } = setup(validDraft());
    model.update((d) => ({
      ...d,
      signatories: [
        { name: 'Ana Example', email: 'ana@quarrytide.test' },
        // Same address, different case.
        { name: 'Bo Example', email: 'ANA@quarrytide.test' },
      ],
    }));

    expect(tree.signatories[0].email().errors()).toEqual([]);
    expect(messages(tree.signatories[1].email().errors())).toEqual([
      'Each signatory needs a different email.',
    ]);
  });

  it('checks the legal name against the server once the sync rules pass', async () => {
    const { tree } = setup(validDraft());
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, NAME_CHECK_DEBOUNCE_MS + 50));
    TestBed.tick();

    expect(tree.company.legalName().pending()).toBe(true);
    const req = http.expectOne((r) => r.url === NAME_AVAILABILITY_API);
    expect(req.request.params.get('name')).toBe('Quarrytide Holdings S.A.');
    req.flush({ available: false });

    // httpResource settles asynchronously after the response.
    await vi.waitFor(() => {
      TestBed.tick();
      expect(tree.company.legalName().pending()).toBe(false);
    });
    expect(messages(tree.company.legalName().errors())).toEqual([
      'A customer with this legal name already exists.',
    ]);
  });
});
