export const SEGMENTS = ['corporate', 'sme', 'public', 'financial'] as const;
export type Segment = (typeof SEGMENTS)[number];
export const SEGMENT_LABELS: Record<Segment, string> = {
  corporate: 'Corporate',
  sme: 'SME',
  public: 'Public sector',
  financial: 'Financial institution',
};

export const RISK_LEVELS = ['low', 'medium', 'high'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];
export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const CUSTOMER_STATUSES = ['active', 'onboarding', 'suspended'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export const STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'Active',
  onboarding: 'Onboarding',
  suspended: 'Suspended',
};

export interface Customer {
  id: string;
  name: string;
  segment: Segment;
  /** ISO 3166-1 alpha-2 */
  country: string;
  risk: RiskLevel;
  status: CustomerStatus;
  /** USD */
  balance: number;
  /** ISO date (YYYY-MM-DD) */
  lastActivity: string;
}
