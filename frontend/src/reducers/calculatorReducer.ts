// Pure state machine for the keypad. It never calls the API: the
// useCalculator hook decides when a calculation is needed, performs it, and
// reports the outcome back with the compute* actions.

import type { BinaryOperation } from '../api/client';

/** Maximum digits the user can type into a single number. */
export const MAX_INPUT_DIGITS = 15;
export const MAX_HISTORY = 10;

export interface HistoryEntry {
  id: number;
  expression: string;
  result: number;
}

export interface CalculatorState {
  /** Number on the display: what the user is typing, or the last result. */
  input: string;
  /** Left operand waiting for the right one. */
  stored: number | null;
  operator: BinaryOperation | null;
  /** An operator was chosen and its right operand has not been entered yet. */
  awaitingOperand: boolean;
  /** The next digit starts a new number instead of appending to the display. */
  fresh: boolean;
  error: string | null;
  busy: boolean;
  history: HistoryEntry[];
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'toggleSign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'operator'; operator: BinaryOperation }
  | { type: 'recall'; value: number }
  | { type: 'clearHistory' }
  | { type: 'computeStart' }
  /** A binary calculation finished; nextOperator is set when it was chained. */
  | { type: 'binarySuccess'; expression: string; result: number; nextOperator: BinaryOperation | null }
  /** A unary calculation finished; its result becomes the current operand. */
  | { type: 'unarySuccess'; expression: string; result: number }
  | { type: 'computeFailure'; message: string };

export const initialState: CalculatorState = {
  input: '0',
  stored: null,
  operator: null,
  awaitingOperand: false,
  fresh: false,
  error: null,
  busy: false,
  history: [],
};

/** The numeric value of what is on the display. */
export function currentValue(state: CalculatorState): number {
  return Number(state.input);
}

/** True when pressing an operator or "=" should send a calculation to the API. */
export function hasPendingCalculation(state: CalculatorState): boolean {
  return state.operator !== null && state.stored !== null && !state.awaitingOperand && state.error === null;
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  // While a request is in flight only its outcome can change the state.
  if (state.busy && !isOutcome(action)) {
    return state;
  }
  // After an error, any key starts over (history is kept).
  if (state.error !== null && action.type !== 'clearHistory') {
    state = { ...initialState, history: state.history };
  }

  switch (action.type) {
    case 'digit': {
      if (state.fresh) {
        return { ...state, input: action.digit, fresh: false, awaitingOperand: false };
      }
      if (state.input === '0' || state.input === '-0') {
        return { ...state, input: state.input.replace('0', action.digit) };
      }
      if (countDigits(state.input) >= MAX_INPUT_DIGITS) {
        return state;
      }
      return { ...state, input: state.input + action.digit };
    }

    case 'decimal': {
      if (state.fresh) {
        return { ...state, input: '0.', fresh: false, awaitingOperand: false };
      }
      if (state.input.includes('.')) {
        return state;
      }
      return { ...state, input: state.input + '.' };
    }

    case 'toggleSign': {
      // Right after an operator, ± starts typing a negative right operand.
      if (state.awaitingOperand) {
        return { ...state, input: '-0', fresh: false, awaitingOperand: false };
      }
      const input = state.input.startsWith('-') ? state.input.slice(1) : '-' + state.input;
      return { ...state, input };
    }

    case 'backspace': {
      if (state.fresh) {
        return state;
      }
      const input = state.input.slice(0, -1);
      return { ...state, input: input === '' || input === '-' ? '0' : input };
    }

    case 'clear':
      return { ...initialState, history: state.history };

    case 'operator': {
      // Pressing another operator before typing the right operand replaces it.
      const stored = state.awaitingOperand ? state.stored : currentValue(state);
      return { ...state, stored, operator: action.operator, awaitingOperand: true, fresh: true };
    }

    case 'recall':
      return { ...state, input: String(action.value), fresh: true, awaitingOperand: false };

    case 'clearHistory':
      return { ...state, history: [] };

    case 'computeStart':
      return { ...state, busy: true };

    case 'binarySuccess':
      return {
        ...state,
        input: String(action.result),
        stored: action.nextOperator === null ? null : action.result,
        operator: action.nextOperator,
        awaitingOperand: action.nextOperator !== null,
        fresh: true,
        busy: false,
        history: addToHistory(state.history, action.expression, action.result),
      };

    case 'unarySuccess':
      // Any pending binary operation is kept: "9 + 16 √ =" gives 13.
      return {
        ...state,
        input: String(action.result),
        awaitingOperand: false,
        fresh: true,
        busy: false,
        history: addToHistory(state.history, action.expression, action.result),
      };

    case 'computeFailure':
      return { ...initialState, history: state.history, error: action.message };
  }
}

function isOutcome(action: CalculatorAction): boolean {
  return action.type === 'binarySuccess' || action.type === 'unarySuccess' || action.type === 'computeFailure';
}

function addToHistory(history: HistoryEntry[], expression: string, result: number): HistoryEntry[] {
  const entry: HistoryEntry = { id: (history[0]?.id ?? 0) + 1, expression, result };
  return [entry, ...history].slice(0, MAX_HISTORY);
}

function countDigits(input: string): number {
  return input.replace(/[^0-9]/g, '').length;
}
