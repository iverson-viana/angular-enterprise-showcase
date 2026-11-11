import { niceTicks } from './chart-scale';

describe('niceTicks', () => {
  it('produces round steps covering the max', () => {
    expect(niceTicks(5_430_000)).toEqual([0, 2_000_000, 4_000_000, 6_000_000]);
    expect(niceTicks(87)).toEqual([0, 25, 50, 75, 100]);
  });

  it('handles an empty or zero series', () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
