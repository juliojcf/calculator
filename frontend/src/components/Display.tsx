interface DisplayProps {
  value: string;
  expression: string;
  error: string | null;
  busy: boolean;
}

export function Display({ value, expression, error, busy }: DisplayProps) {
  // Shrink long numbers so they still fit on small screens.
  const size = value.length > 14 ? 'text-2xl' : value.length > 9 ? 'text-3xl' : 'text-5xl';

  return (
    <div className="flex min-h-32 flex-col items-end justify-end gap-1 rounded-2xl bg-slate-950 px-5 py-4">
      <div className="h-6 text-lg text-slate-400" data-testid="expression">
        {busy ? '…' : expression}
      </div>
      <output
        aria-live="polite"
        aria-label="Result"
        className={`w-full truncate text-right font-light tabular-nums ${error ? 'text-xl text-rose-400' : `${size} text-white`}`}
      >
        {value}
      </output>
    </div>
  );
}
