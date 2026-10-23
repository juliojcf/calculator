import { useReducer } from 'react';
import type { BinaryOperation, CalculatorApi } from '../api/client';
import { describeBinary, describeSqrt, formatNumber, OPERATOR_SYMBOLS } from '../utils/format';
import { errorMessage } from '../utils/errorMessages';
import {
  type CalculatorAction,
  calculatorReducer,
  currentValue,
  hasPendingCalculation,
  initialState,
} from '../reducers/calculatorReducer';

/**
 * Wires the keypad state machine to the API: sync key presses go straight to
 * the reducer, and keys that complete a calculation call the backend first.
 */
export function useCalculator(api: CalculatorApi) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  async function compute(request: () => Promise<number>, onSuccess: (result: number) => CalculatorAction) {
    dispatch({ type: 'computeStart' });
    try {
      dispatch(onSuccess(await request()));
    } catch (error) {
      dispatch({ type: 'computeFailure', message: errorMessage(error) });
    }
  }

  function computePending(nextOperator: BinaryOperation | null) {
    // hasPendingCalculation guarantees both are set.
    const operator = state.operator!;
    const a = state.stored!;
    const b = currentValue(state);
    const expression = describeBinary(operator, a, b);
    return compute(
      () => api.binary(operator, a, b),
      (result) => ({ type: 'binarySuccess', expression, result, nextOperator }),
    );
  }

  function operator(op: BinaryOperation) {
    if (state.busy) return;
    if (hasPendingCalculation(state)) {
      // Chaining: "2 + 3 ×" computes 2 + 3 first, then waits for the next operand.
      void computePending(op);
    } else {
      dispatch({ type: 'operator', operator: op });
    }
  }

  function equals() {
    if (state.busy || !hasPendingCalculation(state)) return;
    void computePending(null);
  }

  function sqrt() {
    if (state.busy) return;
    const a = state.error === null ? currentValue(state) : 0;
    const expression = describeSqrt(a);
    void compute(
      () => api.unary('sqrt', a),
      (result) => ({ type: 'unarySuccess', expression, result }),
    );
  }

  const showsTypedInput = !state.fresh && state.error === null;
  const expression =
    state.stored !== null && state.operator !== null
      ? `${formatNumber(state.stored)} ${OPERATOR_SYMBOLS[state.operator]}`
      : '';

  return {
    display: state.error ?? (showsTypedInput ? state.input : formatNumber(currentValue(state))),
    expression,
    error: state.error,
    busy: state.busy,
    history: state.history,
    /** The operator waiting for its right operand, highlighted on the keypad. */
    activeOperator: state.awaitingOperand ? state.operator : null,
    digit: (digit: string) => dispatch({ type: 'digit', digit }),
    decimal: () => dispatch({ type: 'decimal' }),
    toggleSign: () => dispatch({ type: 'toggleSign' }),
    backspace: () => dispatch({ type: 'backspace' }),
    clear: () => dispatch({ type: 'clear' }),
    recall: (value: number) => dispatch({ type: 'recall', value }),
    clearHistory: () => dispatch({ type: 'clearHistory' }),
    operator,
    equals,
    sqrt,
  };
}

export type CalculatorController = ReturnType<typeof useCalculator>;
