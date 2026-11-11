import {
  applyEach,
  disabled,
  email,
  hidden,
  maxLength,
  min,
  minLength,
  required,
  schema,
  validate,
  validateHttp,
  validateTree,
  type ValidationError,
} from '@angular/forms/signals';

import { isValidAbaRouting, isValidIban } from '../../../shared/validation/checksums';
import { countryName, formatFull } from '../../../shared/utils/format';
import {
  CREDIT_TO_VOLUME_RATIO,
  isValidAccountNumber,
  MAX_SIGNATORIES,
  MIN_MONTHLY_VOLUME,
  type NameAvailability,
  type NewCustomerDraft,
  TAX_ID_RULES,
  usesIban,
} from './new-customer.models';

export const NAME_AVAILABILITY_API = '/api/customers/name-availability';
export const NAME_CHECK_DEBOUNCE_MS = 400;

/**
 * Validation rules for the "New customer" form. Kept apart from the component so the rules
 * read as a spec and can be unit-tested without rendering anything.
 */
export const newCustomerSchema = schema<NewCustomerDraft>((path) => {
  const { company, banking } = path;

  // ── Company ────────────────────────────────────────────────────────────────
  required(company.legalName, { message: 'Enter the legal name.' });
  minLength(company.legalName, 2, { message: 'Legal name must have at least 2 characters.' });
  maxLength(company.legalName, 120, { message: 'Legal name must have at most 120 characters.' });
  // Runs only once the sync rules pass. Best effort: the server re-checks on submit.
  validateHttp<string, NameAvailability>(company.legalName, {
    request: ({ value }) => ({ url: NAME_AVAILABILITY_API, params: { name: value().trim() } }),
    debounce: NAME_CHECK_DEBOUNCE_MS,
    onSuccess: (result) =>
      result.available
        ? null
        : { kind: 'nameTaken', message: 'A customer with this legal name already exists.' },
    onError: () => null,
  });

  required(company.segment, { message: 'Choose a segment.' });
  required(company.country, { message: 'Choose a country.' });

  disabled(company.taxId, {
    when: ({ valueOf }) => (valueOf(company.country) === '' ? 'Choose a country first.' : false),
  });
  required(company.taxId, {
    message: ({ valueOf }) => {
      const country = valueOf(company.country);
      return `Enter the ${country ? TAX_ID_RULES[country].label : 'tax ID'}.`;
    },
  });
  validate(company.taxId, ({ value, valueOf }) => {
    const country = valueOf(company.country);
    if (country === '' || value() === '') return null;
    const rule = TAX_ID_RULES[country];
    return rule.isValid(value())
      ? null
      : { kind: 'taxId', message: `Enter a valid ${rule.label}, for example ${rule.example}.` };
  });

  // ── Bank account: IBAN, or ABA routing + account number in the US ─────────
  hidden(banking.iban, { when: ({ valueOf }) => !usesIban(valueOf(company.country)) });
  required(banking.iban, { message: 'Enter the IBAN.' });
  validate(banking.iban, ({ value, valueOf }) => {
    const iban = value();
    if (iban === '') return null;
    if (!isValidIban(iban)) {
      return { kind: 'iban', message: 'This IBAN is not valid. Check it for typos.' };
    }
    const country = valueOf(company.country);
    return country && iban.slice(0, 2) !== country
      ? { kind: 'ibanCountry', message: `The account must be held in ${countryName(country)}.` }
      : null;
  });

  hidden(banking.routingNumber, { when: ({ valueOf }) => usesIban(valueOf(company.country)) });
  required(banking.routingNumber, { message: 'Enter the routing number.' });
  validate(banking.routingNumber, ({ value }) =>
    value() === '' || isValidAbaRouting(value())
      ? null
      : { kind: 'routing', message: 'Enter a valid 9-digit ABA routing number.' },
  );

  hidden(banking.accountNumber, { when: ({ valueOf }) => usesIban(valueOf(company.country)) });
  required(banking.accountNumber, { message: 'Enter the account number.' });
  validate(banking.accountNumber, ({ value }) =>
    value() === '' || isValidAccountNumber(value())
      ? null
      : { kind: 'account', message: 'Account numbers have 4 to 17 digits.' },
  );

  // ── Limits ────────────────────────────────────────────────────────────────
  required(banking.monthlyVolume, { message: 'Enter the expected monthly volume.' });
  min(banking.monthlyVolume, MIN_MONTHLY_VOLUME, {
    message: `Monthly volume must be at least ${formatFull(MIN_MONTHLY_VOLUME, 'currency')}.`,
  });
  // Cross-field rule: re-evaluates whenever either amount changes.
  validate(banking.creditLimit, ({ value, valueOf }) => {
    const limit = value();
    const volume = valueOf(banking.monthlyVolume);
    if (limit === null || volume === null) return null;
    const max = volume * CREDIT_TO_VOLUME_RATIO;
    return limit <= max
      ? null
      : {
          kind: 'creditPolicy',
          message: `Credit limit can't exceed ${CREDIT_TO_VOLUME_RATIO}× the monthly volume (${formatFull(max, 'currency')}).`,
        };
  });

  // ── Signatories ───────────────────────────────────────────────────────────
  validate(path.signatories, ({ value }) => {
    const count = value().length;
    if (count === 0) return { kind: 'minItems', message: 'Add at least one signatory.' };
    return count > MAX_SIGNATORIES
      ? { kind: 'maxItems', message: `Add at most ${MAX_SIGNATORIES} signatories.` }
      : null;
  });
  applyEach(path.signatories, (signatory) => {
    required(signatory.name, { message: 'Enter the full name.' });
    required(signatory.email, { message: 'Enter the email address.' });
    email(signatory.email, { message: 'Enter a valid email address.' });
  });
  // Tree validator: one rule over the list, errors land on each repeated email field.
  validateTree(path.signatories, ({ value, fieldTree }) => {
    const seen = new Set<string>();
    const errors: ValidationError.WithOptionalFieldTree[] = [];
    value().forEach((signatory, index) => {
      const key = signatory.email.trim().toLowerCase();
      if (key === '') return;
      if (seen.has(key)) {
        errors.push({
          kind: 'duplicateEmail',
          message: 'Each signatory needs a different email.',
          fieldTree: fieldTree[index].email,
        });
      }
      seen.add(key);
    });
    return errors;
  });

  // ── Compliance ────────────────────────────────────────────────────────────
  validate(path.kycConfirmed, ({ value }) =>
    value() ? null : { kind: 'kyc', message: 'Confirm the KYC documents were verified.' },
  );
});
