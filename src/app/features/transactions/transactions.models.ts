export const TRANSACTION_TYPES = ['credit', 'debit'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export const TYPE_LABELS: Record<TransactionType, string> = { credit: 'Credit', debit: 'Debit' };

export const TRANSACTION_STATUSES = ['completed', 'pending', 'failed', 'flagged'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export const TX_STATUS_LABELS: Record<TransactionStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  flagged: 'Flagged',
};

export const PAYMENT_METHODS = ['wire', 'ach', 'sepa', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const METHOD_LABELS: Record<PaymentMethod, string> = {
  wire: 'Wire',
  ach: 'ACH',
  sepa: 'SEPA',
  card: 'Card',
};

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
