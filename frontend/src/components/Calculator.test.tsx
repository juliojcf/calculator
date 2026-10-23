import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type BinaryOperation, type CalculatorApi } from '../api/client';
import { Calculator } from './Calculator';

/** A fake API that computes locally, so tests don't need the backend. */
function fakeApi(): CalculatorApi {
  const ops: Record<BinaryOperation, (a: number, b: number) => number> = {
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => a / b,
    power: (a, b) => a ** b,
    percentage: (a, b) => (a / 100) * b,
  };
  return {
    binary: vi.fn(async (op: BinaryOperation, a: number, b: number) => {
      if (op === 'divide' && b === 0) throw new ApiError('division_by_zero', 'division by zero', 422);
      return ops[op](a, b);
    }),
    unary: vi.fn(async (_op: 'sqrt', a: number) => {
      if (a < 0) throw new ApiError('negative_sqrt', 'negative', 422);
      return Math.sqrt(a);
    }),
  };
}

function setup(api = fakeApi()) {
  const user = userEvent.setup();
  render(<Calculator api={api} />);
  const press = async (...names: string[]) => {
    for (const name of names) {
      await user.click(screen.getByRole('button', { name }));
    }
  };
  return { api, user, press, result: () => screen.getByRole('status', { name: 'Result' }) };
}

describe('Calculator', () => {
  it('starts at zero', () => {
    const { result } = setup();
    expect(result()).toHaveTextContent('0');
  });

  it('adds two numbers through the API', async () => {
    const { api, press, result } = setup();
    await press('1', '2', 'add', '3', 'equals');

    expect(result()).toHaveTextContent('15');
    expect(api.binary).toHaveBeenCalledWith('add', 12, 3);
  });

  it('shows the pending expression and highlights the operator', async () => {
    const { press } = setup();
    await press('8', 'divide');

    expect(screen.getByTestId('expression')).toHaveTextContent('8 ÷');
    expect(screen.getByRole('button', { name: 'divide' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('chains operations', async () => {
    const { press, result } = setup();
    await press('2', 'add', '3', 'multiply', '4', 'equals');

    expect(result()).toHaveTextContent('20');
  });

  it('hides floating point noise', async () => {
    const { press, result } = setup();
    await press('decimal point', '1', 'add', 'decimal point', '2', 'equals');

    expect(result()).toHaveTextContent(/^0\.3$/);
  });

  it('handles negative numbers, power, percentage and square root', async () => {
    const { press, result } = setup();

    await press('2', 'power', '1', '0', 'equals');
    expect(result()).toHaveTextContent('1024');

    await press('2', '0', 'percent of', '5', '0', 'equals');
    expect(result()).toHaveTextContent('10');

    await press('8', '1', 'square root');
    expect(result()).toHaveTextContent('9');

    await press('5', 'toggle sign', 'multiply', '3', 'equals');
    expect(result()).toHaveTextContent('-15');
  });

  it('shows API errors and recovers on the next key', async () => {
    const { press, result } = setup();
    await press('1', 'divide', '0', 'equals');

    expect(result()).toHaveTextContent('Cannot divide by zero');

    await press('7');
    expect(result()).toHaveTextContent('7');
  });

  it('shows a message when the server is unreachable', async () => {
    const api = fakeApi();
    vi.mocked(api.unary).mockRejectedValue(new ApiError('network_error', 'down'));
    const { press, result } = setup(api);

    await press('4', 'square root');
    expect(result()).toHaveTextContent('Server unavailable, try again');
  });

  it('does not call the API for an incomplete expression', async () => {
    const { api, press, result } = setup();
    await press('5', 'add', 'equals');

    expect(api.binary).not.toHaveBeenCalled();
    expect(result()).toHaveTextContent('5');
  });

  it('clears the display', async () => {
    const { press, result } = setup();
    await press('9', 'add', '1', 'clear');

    expect(result()).toHaveTextContent('0');
    expect(screen.getByTestId('expression')).toBeEmptyDOMElement();
  });

  it('records calculations in the history and reuses a result', async () => {
    const { press, user, result } = setup();
    await press('6', 'multiply', '7', 'equals');

    const history = screen.getByRole('region', { name: 'History' });
    const entry = within(history).getByRole('button', { name: /6 × 7 =\s*42/ });

    await press('clear', '1', 'add');
    await user.click(entry);
    await press('equals');
    expect(result()).toHaveTextContent('43');

    await user.click(within(history).getByRole('button', { name: 'Clear' }));
    expect(within(history).getByText('No calculations yet.')).toBeInTheDocument();
  });

  it('can be used with a physical keyboard', async () => {
    const { user, result } = setup();

    await user.keyboard('12.5*2{Enter}');
    expect(result()).toHaveTextContent('25');

    await user.keyboard('{Escape}9{Backspace}7/2=');
    expect(result()).toHaveTextContent('3.5');

    await user.keyboard('16s');
    expect(result()).toHaveTextContent('4');

    await user.keyboard('3n');
    expect(result()).toHaveTextContent('-3');
  });

  it('ignores keyboard shortcuts with modifiers', async () => {
    const { user, result } = setup();
    await user.keyboard('{Control>}5{/Control}');
    expect(result()).toHaveTextContent('0');
  });
});
