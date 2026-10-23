import type { BinaryOperation } from '../api/client';

const SIGNIFICANT_DIGITS = 12;
const MAX_PLAIN = 1e15;
const MIN_PLAIN = 1e-9;

/**
 * Formats a number for display.
 *
 * Results are rounded to 12 significant digits, which hides binary floating
 * point noise (0.1 + 0.2 shows as 0.3) while keeping plenty of precision.
 * Very large or very small magnitudes switch to exponential notation.
 */
export function formatNumber(value: number): string {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= MAX_PLAIN || abs < MIN_PLAIN) {
    // "1.234500000e+20" -> "1.2345e+20"
    return value.toExponential(SIGNIFICANT_DIGITS - 1).replace(/\.?0+e/, 'e');
  }
  return String(Number(value.toPrecision(SIGNIFICANT_DIGITS)));
}

export const OPERATOR_SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  percentage: '% of',
};

/** Human-readable expression for the history, e.g. "12 ÷ 4" or "20% of 50". */
export function describeBinary(operation: BinaryOperation, a: number, b: number): string {
  const separator = operation === 'percentage' ? '' : ' ';
  return `${formatNumber(a)}${separator}${OPERATOR_SYMBOLS[operation]} ${formatNumber(b)}`;
}

export function describeSqrt(a: number): string {
  return `√${formatNumber(a)}`;
}
