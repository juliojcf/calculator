import { describe, expect, it } from 'vitest';
import {
  type CalculatorAction,
  type CalculatorState,
  calculatorReducer,
  hasPendingCalculation,
  initialState,
  MAX_HISTORY,
  MAX_INPUT_DIGITS,
} from './calculatorReducer';

function run(...actions: CalculatorAction[]): CalculatorState {
  return actions.reduce(calculatorReducer, initialState);
}

const digits = (value: string): CalculatorAction[] =>
  [...value].map((c) => (c === '.' ? { type: 'decimal' } : { type: 'digit', digit: c }));

describe('number entry', () => {
  it('replaces the initial zero', () => {
    expect(run(...digits('07')).input).toBe('7');
  });

  it('appends digits and a single decimal point', () => {
    expect(run(...digits('12.5.0')).input).toBe('12.50');
  });

  it('starts with "0." when the decimal point comes first', () => {
    expect(run({ type: 'decimal' }).input).toBe('0.');
  });

  it(`limits input to ${MAX_INPUT_DIGITS} digits`, () => {
    expect(run(...digits('1'.repeat(20))).input).toBe('1'.repeat(MAX_INPUT_DIGITS));
  });

  it('toggles the sign', () => {
    expect(run(...digits('5'), { type: 'toggleSign' }).input).toBe('-5');
    expect(run(...digits('5'), { type: 'toggleSign' }, { type: 'toggleSign' }).input).toBe('5');
  });

  it('typing after toggling the sign of zero keeps the sign', () => {
    expect(run({ type: 'toggleSign' }, ...digits('3')).input).toBe('-3');
  });

  it('backspace removes the last character and falls back to zero', () => {
    expect(run(...digits('123'), { type: 'backspace' }).input).toBe('12');
    expect(run(...digits('7'), { type: 'backspace' }).input).toBe('0');
    expect(run(...digits('7'), { type: 'toggleSign' }, { type: 'backspace' }).input).toBe('0');
  });

  it('clear resets everything but the history', () => {
    const withHistory = run({ type: 'binarySuccess', expression: '1 + 1', result: 2, nextOperator: null });
    const state = calculatorReducer({ ...withHistory, input: '9' }, { type: 'clear' });
    expect(state).toEqual({ ...initialState, history: withHistory.history });
  });
});

describe('operators', () => {
  it('stores the left operand and waits for the right one', () => {
    const state = run(...digits('12'), { type: 'operator', operator: 'divide' });
    expect(state).toMatchObject({ stored: 12, operator: 'divide', awaitingOperand: true });
    expect(hasPendingCalculation(state)).toBe(false);
  });

  it('the next digit starts the right operand', () => {
    const state = run(...digits('12'), { type: 'operator', operator: 'divide' }, ...digits('4'));
    expect(state.input).toBe('4');
    expect(hasPendingCalculation(state)).toBe(true);
  });

  it('a second operator replaces the first while no operand was typed', () => {
    const state = run(
      ...digits('3'),
      { type: 'operator', operator: 'add' },
      { type: 'operator', operator: 'multiply' },
    );
    expect(state).toMatchObject({ stored: 3, operator: 'multiply' });
  });

  it('± right after an operator starts a negative operand', () => {
    const state = run(...digits('3'), { type: 'operator', operator: 'add' }, { type: 'toggleSign' }, ...digits('2'));
    expect(state.input).toBe('-2');
    expect(state.stored).toBe(3);
  });

  it('backspace does not edit a number that is not being typed', () => {
    const state = run(...digits('3'), { type: 'operator', operator: 'add' }, { type: 'backspace' });
    expect(state.input).toBe('3');
  });
});

describe('calculation outcomes', () => {
  const pending = run(...digits('2'), { type: 'operator', operator: 'add' }, ...digits('3'), { type: 'computeStart' });

  it('ignores key presses while a calculation is in flight', () => {
    expect(calculatorReducer(pending, { type: 'digit', digit: '9' })).toBe(pending);
  });

  it('shows the result of a binary calculation and records it', () => {
    const state = calculatorReducer(pending, {
      type: 'binarySuccess',
      expression: '2 + 3',
      result: 5,
      nextOperator: null,
    });
    expect(state).toMatchObject({ input: '5', stored: null, operator: null, busy: false, fresh: true });
    expect(state.history).toEqual([{ id: 1, expression: '2 + 3', result: 5 }]);
  });

  it('chains into the next operator', () => {
    const state = calculatorReducer(pending, {
      type: 'binarySuccess',
      expression: '2 + 3',
      result: 5,
      nextOperator: 'multiply',
    });
    expect(state).toMatchObject({ stored: 5, operator: 'multiply', awaitingOperand: true });
  });

  it('a unary result keeps the pending binary operation', () => {
    const state = calculatorReducer(pending, { type: 'unarySuccess', expression: '√3', result: 1.7 });
    expect(state).toMatchObject({ input: '1.7', stored: 2, operator: 'add' });
    expect(hasPendingCalculation(state)).toBe(true);
  });

  it('a new digit after a result starts a new number', () => {
    const done = calculatorReducer(pending, {
      type: 'binarySuccess',
      expression: '2 + 3',
      result: 5,
      nextOperator: null,
    });
    expect(calculatorReducer(done, { type: 'digit', digit: '8' }).input).toBe('8');
  });

  it('an error resets the state and the next key starts over', () => {
    const failed = calculatorReducer(pending, { type: 'computeFailure', message: 'Cannot divide by zero' });
    expect(failed).toMatchObject({ error: 'Cannot divide by zero', busy: false, stored: null });

    const next = calculatorReducer(failed, { type: 'digit', digit: '4' });
    expect(next).toMatchObject({ error: null, input: '4' });
  });

  it(`keeps only the last ${MAX_HISTORY} history entries, newest first`, () => {
    let state = initialState;
    for (let i = 1; i <= MAX_HISTORY + 2; i++) {
      state = calculatorReducer(state, { type: 'binarySuccess', expression: `${i}`, result: i, nextOperator: null });
    }
    expect(state.history).toHaveLength(MAX_HISTORY);
    expect(state.history[0].result).toBe(MAX_HISTORY + 2);
  });

  it('recall puts a history result on the display', () => {
    const state = run(...digits('3'), { type: 'operator', operator: 'add' }, { type: 'recall', value: 10 });
    expect(state.input).toBe('10');
    expect(hasPendingCalculation(state)).toBe(true);
  });

  it('clearHistory empties the history', () => {
    const state = run(
      { type: 'binarySuccess', expression: '1 + 1', result: 2, nextOperator: null },
      { type: 'clearHistory' },
    );
    expect(state.history).toEqual([]);
  });
});
