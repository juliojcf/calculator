import type { CalculatorApi } from '../api/client';
import { useCalculator } from '../hooks/useCalculator';
import { useKeyboard } from '../hooks/useKeyboard';
import { Display } from './Display';
import { History } from './History';
import { Keypad } from './Keypad';

interface CalculatorProps {
  api: CalculatorApi;
}

export function Calculator({ api }: CalculatorProps) {
  const calc = useCalculator(api);
  useKeyboard(calc);

  return (
    <div className="grid w-full max-w-3xl gap-4 md:grid-cols-[1fr_16rem]">
      <section aria-label="Calculator" className="flex flex-col gap-4 rounded-3xl bg-slate-800 p-4 shadow-xl sm:p-5">
        <Display value={calc.display} expression={calc.expression} error={calc.error} busy={calc.busy} />
        <Keypad calc={calc} />
      </section>
      <History entries={calc.history} onSelect={calc.recall} onClear={calc.clearHistory} />
    </div>
  );
}
