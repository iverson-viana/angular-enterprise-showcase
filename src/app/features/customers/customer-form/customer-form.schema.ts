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

import { translateEnglish } from '../../../core/i18n/english';
import type { Translate } from '../../../core/i18n/translate';
import { countryName, formatFull } from '../../../shared/utils/format';
import { isValidAbaRouting, isValidIban } from '../../../shared/validation/checksums';
import {
  CREDIT_TO_VOLUME_RATIO,
  type CustomerCountry,
  type CustomerDraft,
  isValidAccountNumber,
  MAX_SIGNATORIES,
  MIN_MONTHLY_VOLUME,
  type NameAvailability,
  TAX_ID_RULES,
  usesIban,
} from './customer-form.models';

export const NAME_AVAILABILITY_API = '/api/customers/name-availability';
export const NAME_CHECK_DEBOUNCE_MS = 400;
const LEGAL_NAME_MIN = 2;
const LEGAL_NAME_MAX = 120;

export interface CustomerSchemaOptions {
  /** Set when editing: the customer itself doesn't count as a name conflict. */
  customerId?: () => string | undefined;
  /** Set when editing: the saved name skips the availability check. */
  originalLegalName?: () => string | undefined;
  /**
   * Translator for messages (the app passes `I18n.t`). Messages are produced lazily inside
   * reactive validators, so errors already on screen switch language with the rest of the UI.
   */
  t?: Translate;
}

/**
 * Validation rules for the customer form (create and edit). Kept apart from the component so
 * the rules read as a spec and can be unit-tested without rendering anything.
 */
export const customerFormSchema = ({
  customerId = () => undefined,
  originalLegalName = () => undefined,
  t = translateEnglish,
}: CustomerSchemaOptions = {}) => {
  const taxIdLabel = (country: CustomerCountry) => t(`customerForm.taxIds.${country}`);

  return schema<CustomerDraft>((path) => {
    const { company, banking } = path;

    // ── Company ──────────────────────────────────────────────────────────────
    required(company.legalName, { message: () => t('customerForm.errors.legalNameRequired') });
    minLength(company.legalName, LEGAL_NAME_MIN, {
      message: () => t('customerForm.errors.legalNameMin', { min: LEGAL_NAME_MIN }),
    });
    maxLength(company.legalName, LEGAL_NAME_MAX, {
      message: () => t('customerForm.errors.legalNameMax', { max: LEGAL_NAME_MAX }),
    });
    // Runs only once the sync rules pass. Best effort: the server re-checks on submit.
    validateHttp<string, NameAvailability>(company.legalName, {
      when: ({ value }) => value().trim() !== originalLegalName(),
      request: ({ value }) => {
        const params: Record<string, string> = { name: value().trim() };
        const id = customerId();
        if (id) params['excludeId'] = id;
        return { url: NAME_AVAILABILITY_API, params };
      },
      debounce: NAME_CHECK_DEBOUNCE_MS,
      onSuccess: (result) =>
        result.available
          ? null
          : { kind: 'nameTaken', message: t('customerForm.errors.nameTaken') },
      onError: () => null,
    });

    required(company.segment, { message: () => t('customerForm.errors.segmentRequired') });
    required(company.country, { message: () => t('customerForm.errors.countryRequired') });

    disabled(company.taxId, {
      when: ({ valueOf }) =>
        valueOf(company.country) === '' ? t('customerForm.chooseCountryFirst') : false,
    });
    required(company.taxId, {
      message: ({ valueOf }) => {
        const country = valueOf(company.country);
        const label = country ? taxIdLabel(country) : t('customerForm.taxId');
        return t('customerForm.errors.taxIdRequired', { label });
      },
    });
    validate(company.taxId, ({ value, valueOf }) => {
      const country = valueOf(company.country);
      if (country === '' || value() === '') return null;
      const rule = TAX_ID_RULES[country];
      return rule.isValid(value())
        ? null
        : {
            kind: 'taxId',
            message: t('customerForm.errors.taxIdInvalid', {
              label: taxIdLabel(country),
              example: rule.example,
            }),
          };
    });

    // ── Bank account: IBAN, or ABA routing + account number in the US ───────
    hidden(banking.iban, { when: ({ valueOf }) => !usesIban(valueOf(company.country)) });
    required(banking.iban, { message: () => t('customerForm.errors.ibanRequired') });
    validate(banking.iban, ({ value, valueOf }) => {
      const iban = value();
      if (iban === '') return null;
      if (!isValidIban(iban)) {
        return { kind: 'iban', message: t('customerForm.errors.ibanInvalid') };
      }
      const country = valueOf(company.country);
      return country && iban.slice(0, 2) !== country
        ? {
            kind: 'ibanCountry',
            message: t('customerForm.errors.ibanCountry', { country: countryName(country) }),
          }
        : null;
    });

    hidden(banking.routingNumber, { when: ({ valueOf }) => usesIban(valueOf(company.country)) });
    required(banking.routingNumber, { message: () => t('customerForm.errors.routingRequired') });
    validate(banking.routingNumber, ({ value }) =>
      value() === '' || isValidAbaRouting(value())
        ? null
        : { kind: 'routing', message: t('customerForm.errors.routingInvalid') },
    );

    hidden(banking.accountNumber, { when: ({ valueOf }) => usesIban(valueOf(company.country)) });
    required(banking.accountNumber, { message: () => t('customerForm.errors.accountRequired') });
    validate(banking.accountNumber, ({ value }) =>
      value() === '' || isValidAccountNumber(value())
        ? null
        : { kind: 'account', message: t('customerForm.errors.accountInvalid') },
    );

    // ── Limits ──────────────────────────────────────────────────────────────
    required(banking.monthlyVolume, { message: () => t('customerForm.errors.volumeRequired') });
    min(banking.monthlyVolume, MIN_MONTHLY_VOLUME, {
      message: () =>
        t('customerForm.errors.volumeMin', {
          amount: formatFull(MIN_MONTHLY_VOLUME, 'currency'),
        }),
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
            message: t('customerForm.errors.creditPolicy', {
              ratio: CREDIT_TO_VOLUME_RATIO,
              amount: formatFull(max, 'currency'),
            }),
          };
    });

    // ── Signatories ─────────────────────────────────────────────────────────
    validate(path.signatories, ({ value }) => {
      const count = value().length;
      if (count === 0) {
        return { kind: 'minItems', message: t('customerForm.errors.signatoriesMin') };
      }
      return count > MAX_SIGNATORIES
        ? {
            kind: 'maxItems',
            message: t('customerForm.errors.signatoriesMax', { max: MAX_SIGNATORIES }),
          }
        : null;
    });
    applyEach(path.signatories, (signatory) => {
      required(signatory.name, { message: () => t('customerForm.errors.nameRequired') });
      required(signatory.email, { message: () => t('customerForm.errors.emailRequired') });
      email(signatory.email, { message: () => t('customerForm.errors.emailInvalid') });
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
            message: t('customerForm.errors.duplicateEmail'),
            fieldTree: fieldTree[index].email,
          });
        }
        seen.add(key);
      });
      return errors;
    });

    // ── Compliance ──────────────────────────────────────────────────────────
    validate(path.kycConfirmed, ({ value }) =>
      value() ? null : { kind: 'kyc', message: t('customerForm.errors.kycRequired') },
    );
  });
};
