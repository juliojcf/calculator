import type { BinaryOperation } from '../api/client';
import type { CalculatorController } from '../hooks/useCalculator';

type Variant = 'digit' | 'operator' | 'function' | 'equals';

interface KeyDef {
  label: string;
  name: string;
  onPress: () => void;
  variant: Variant;
  wide?: boolean;
  operator?: BinaryOperation;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  digit: 'bg-slate-700 text-white hover:bg-slate-600',
  operator: 'bg-amber-500 text-white hover:bg-amber-400',
  function: 'bg-slate-500 text-slate-950 hover:bg-slate-400',
  equals: 'bg-sky-500 text-white hover:bg-sky-400',
};

interface KeypadProps {
  calc: CalculatorController;
}

export function Keypad({ calc }: KeypadProps) {
  const digit = (d: string): KeyDef => ({ label: d, name: d, onPress: () => calc.digit(d), variant: 'digit' });
  const op = (operator: BinaryOperation, label: string, name: string): KeyDef => ({
    label,
    name,
    onPress: () => calc.operator(operator),
    variant: 'operator',
    operator,
  });

  const keys: KeyDef[] = [
    { label: '√', name: 'square root', onPress: calc.sqrt, variant: 'function', wide: true },
    { ...op('power', 'xʸ', 'power'), variant: 'function', wide: true },
    { ...op('percentage', '%', 'percent of'), variant: 'function' },
    { label: 'C', name: 'clear', onPress: calc.clear, variant: 'function' },
    { label: '⌫', name: 'backspace', onPress: calc.backspace, variant: 'function' },
    op('divide', '÷', 'divide'),
    digit('7'),
    digit('8'),
    digit('9'),
    op('multiply', '×', 'multiply'),
    digit('4'),
    digit('5'),
    digit('6'),
    op('subtract', '−', 'subtract'),
    digit('1'),
    digit('2'),
    digit('3'),
    op('add', '+', 'add'),
    { label: '±', name: 'toggle sign', onPress: calc.toggleSign, variant: 'digit' },
    digit('0'),
    { label: '.', name: 'decimal point', onPress: calc.decimal, variant: 'digit' },
    { label: '=', name: 'equals', onPress: calc.equals, variant: 'equals' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {keys.map((key) => {
        const active = key.operator !== undefined && key.operator === calc.activeOperator;
        return (
          <button
            key={key.name}
            type="button"
            aria-label={key.name}
            aria-pressed={key.operator ? active : undefined}
            onClick={key.onPress}
            className={[
              'h-14 rounded-xl text-2xl font-medium transition-colors select-none sm:h-16',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300',
              'active:scale-95 disabled:opacity-60',
              key.wide ? 'col-span-2' : '',
              active ? 'bg-white text-amber-600 hover:bg-white' : VARIANT_CLASSES[key.variant],
            ].join(' ')}
          >
            {key.label}
          </button>
        );
      })}
    </div>
  );
}
