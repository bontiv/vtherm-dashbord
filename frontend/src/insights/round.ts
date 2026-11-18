/**
 * Rounding as Python does it, for the values that Versatile Thermostat rounds (`round(value, 2)`).
 *
 * Python rounds the exact binary value, and an exact tie to the even digit (`round(0.125, 2)` is 0.12). `Number.toFixed` rounds the exact
 * binary value too, but a tie away from zero. The two differ only on exact ties, which this function detects.
 */

/**
 * Round a number to `digits` decimals exactly like Python's `round(value, digits)`.
 *
 * @param value - The number to round.
 * @param digits - The number of decimals, 0 to 20.
 * @returns The rounded number; -0 is returned as 0.
 */
export function pyRound(value: number, digits: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const abs = Math.abs(value);
  let rounded = Number(abs.toFixed(digits));
  if (abs < 1e21) {
    // toFixed(100) is the exact decimal expansion of the binary value for the magnitudes of temperatures and percentages.
    const exact = abs.toFixed(100);
    const dot = exact.indexOf(".");
    const tail = exact.slice(dot + 1 + digits);
    if (/^50*$/.test(tail)) {
      const kept = exact.slice(0, dot + 1 + digits);
      const lastDigit = digits === 0 ? exact.charAt(dot - 1) : exact.charAt(dot + digits);
      if (Number(lastDigit) % 2 === 0) {
        // A tie on an even digit: Python keeps it, toFixed went up.
        rounded = Number(kept);
      }
    }
  }
  const signed = value < 0 ? -rounded : rounded;
  return signed === 0 ? 0 : signed;
}
