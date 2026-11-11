export const TRANSACTION_TYPES = ['credit', 'debit'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ['completed', 'pending', 'failed', 'flagged'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const PAYMENT_METHODS = ['wire', 'ach', 'sepa', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Transaction {
  id: string;
  /** ISO timestamp */
  bookedAt: string;
  customerId: string;
  customerName: string;
  type: TransactionType;
  method: PaymentMethod;
  status: TransactionStatus;
  /** USD, always positive — `type` gives the direction. */
  amount: number;
  reference: string;
}
