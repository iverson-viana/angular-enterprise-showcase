import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import { toDraft } from '../../app/features/customers/customer-form/customer-form.models';
import { customerFormSchema } from '../../app/features/customers/customer-form/customer-form.schema';
import { allCustomers, customerDetails, isCustomerNameTaken } from './customers';

describe('mock customer details', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('generates onboarding data that passes the form rules, so any row can be edited', () => {
    for (const customer of allCustomers().slice(0, 300)) {
      const details = customerDetails(customer.id)!;
      const tree = TestBed.runInInjectionContext(() =>
        form(signal(toDraft(details)), customerFormSchema()),
      );
      const problems = tree()
        .errorSummary()
        .map((e) => e.message);
      expect(problems, `${customer.id} (${customer.country})`).toEqual([]);
    }
  });

  it('is deterministic per customer', () => {
    const id = allCustomers()[0].id;
    expect(customerDetails(id)).toEqual(customerDetails(id));
  });

  it('lets a customer keep its own name', () => {
    const { id, name } = allCustomers()[0];
    expect(isCustomerNameTaken(name)).toBe(true);
    expect(isCustomerNameTaken(name.toUpperCase(), id)).toBe(
      allCustomers().filter((c) => c.name === name).length > 1,
    );
  });
});
