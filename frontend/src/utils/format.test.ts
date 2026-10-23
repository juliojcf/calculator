import { describe, expect, it } from 'vitest';
import { describeBinary, describeSqrt, formatNumber } from './format';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [42, '42'],
    [-3.5, '-3.5'],
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.333333333333'],
    [123456789012, '123456789012'],
    [1e21, '1e+21'],
    [1.2345e20, '1.2345e+20'],
    [1e-10, '1e-10'],
    [0.000123, '0.000123'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });
});

describe('describe*', () => {
  it('describes binary operations', () => {
    expect(describeBinary('divide', 12, 4)).toBe('12 ÷ 4');
    expect(describeBinary('subtract', 1, -2)).toBe('1 − -2');
    expect(describeBinary('percentage', 20, 50)).toBe('20% of 50');
  });

  it('describes square roots', () => {
    expect(describeSqrt(16)).toBe('√16');
  });
});
