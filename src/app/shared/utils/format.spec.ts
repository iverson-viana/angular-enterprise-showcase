import {
  formatCompact,
  formatFull,
  formatMonth,
  formatSignedPercent,
  relativeChange,
} from './format';

describe('format utils', () => {
  it('compacts currency and large counts', () => {
    expect(formatCompact(4_213_567, 'currency')).toBe('$4.2M');
    expect(formatCompact(1_284, 'count')).toBe('1,284');
    expect(formatCompact(12_900, 'count')).toBe('12.9K');
  });

  it('formats full values without decimals', () => {
    expect(formatFull(4_213_567.4, 'currency')).toBe('$4,213,567');
    expect(formatFull(1284, 'count')).toBe('1,284');
  });

  it('computes relative change against the absolute base', () => {
    expect(relativeChange(110, 100)).toBeCloseTo(0.1);
    expect(relativeChange(-50, -100)).toBeCloseTo(0.5);
    expect(relativeChange(5, 0)).toBeNull();
  });

  it('signs percentages', () => {
    expect(formatSignedPercent(0.042)).toBe('+4.2%');
    expect(formatSignedPercent(-0.013)).toBe('-1.3%');
    expect(formatSignedPercent(0)).toBe('0%');
  });

  it('formats ISO months', () => {
    expect(formatMonth('2026-03', 'short')).toBe('Mar');
    expect(formatMonth('2026-03', 'long')).toBe('March 2026');
  });
});
