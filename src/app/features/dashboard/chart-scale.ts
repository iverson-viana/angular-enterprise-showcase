/** Rounds a raw step up to a "nice" value: 1, 2, 2.5, 5 or 10 × 10ⁿ. */
function niceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const fraction = rawStep / magnitude;
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Evenly spaced, round tick values from 0 to at least `max` (about `targetCount` intervals). */
export function niceTicks(max: number, targetCount = 4): number[] {
  if (max <= 0) return [0, 1];
  const step = niceStep(max / targetCount);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}
