/**
 * Precision Utility
 * Handles precise numeric calculations for financial values to avoid floating-point errors.
 */

/**
 * Rounds a number to a specific number of decimal places.
 * Default is 2 decimal places for currency/points.
 */
export function roundTo(value: number | string, decimals: number = 2): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Adds multiple values precisely.
 */
export function addPrecise(...values: (number | string)[]): number {
  return values.reduce((sum: number, val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return roundTo(sum + (isNaN(num) ? 0 : num));
  }, 0);
}

/**
 * Subtracts values precisely.
 */
export function subtractPrecise(base: number | string, ...toSubtract: (number | string)[]): number {
  const baseNum = typeof base === 'string' ? parseFloat(base) : base;
  const subTotal = toSubtract.reduce((sum: number, val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
  return roundTo((isNaN(baseNum) ? 0 : baseNum) - subTotal);
}

/**
 * Multiplies values precisely.
 */
export function multiplyPrecise(a: number | string, b: number | string): number {
  const numA = typeof a === 'string' ? parseFloat(a) : a;
  const numB = typeof b === 'string' ? parseFloat(b) : b;
  return roundTo((isNaN(numA) ? 0 : numA) * (isNaN(numB) ? 0 : numB));
}

/**
 * Divides values precisely.
 */
export function dividePrecise(a: number | string, b: number | string): number {
  const numA = typeof a === 'string' ? parseFloat(a) : a;
  const numB = typeof b === 'string' ? parseFloat(b) : b;
  if (isNaN(numB) || numB === 0) throw new Error("Division by zero or NaN");
  return roundTo((isNaN(numA) ? 0 : numA) / numB);
}

/**
 * Compares two values for equality within a small epsilon.
 */
export function areEqualPrecise(a: number | string, b: number | string, epsilon: number = 0.001): boolean {
  const numA = typeof a === 'string' ? parseFloat(a) : a;
  const numB = typeof b === 'string' ? parseFloat(b) : b;
  return Math.abs((isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB)) < epsilon;
}
