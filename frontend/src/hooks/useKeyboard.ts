import { useEffect, useRef } from 'react';
import type { BinaryOperation } from '../api/client';
import type { CalculatorController } from './useCalculator';

const OPERATOR_KEYS: Record<string, BinaryOperation> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  x: 'multiply',
  '/': 'divide',
  '^': 'power',
  '%': 'percentage',
};

/**
 * Maps a keyboard key to a calculator action.
 * Returns false when the key is not a calculator key.
 */
export function handleCalculatorKey(key: string, calc: CalculatorController): boolean {
  if (/^[0-9]$/.test(key)) {
    calc.digit(key);
    return true;
  }
  if (key in OPERATOR_KEYS) {
    calc.operator(OPERATOR_KEYS[key]);
    return true;
  }
  switch (key) {
    case '.':
    case ',':
      calc.decimal();
      return true;
    case 'Enter':
    case '=':
      calc.equals();
      return true;
    case 'Backspace':
      calc.backspace();
      return true;
    case 'Escape':
    case 'Delete':
      calc.clear();
      return true;
    case 's':
      calc.sqrt();
      return true;
    case 'n':
      calc.toggleSign();
      return true;
    default:
      return false;
  }
}

/** Lets the user drive the calculator from a physical keyboard. */
export function useKeyboard(calc: CalculatorController) {
  // Keep the latest controller in a ref so the listener is attached only once.
  const calcRef = useRef(calc);
  useEffect(() => {
    calcRef.current = calc;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (handleCalculatorKey(event.key, calcRef.current)) {
        // Stops "/" opening quick find and Enter also clicking the focused button.
        event.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
