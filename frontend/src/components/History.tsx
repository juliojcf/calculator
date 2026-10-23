import { formatNumber } from '../utils/format';
import type { HistoryEntry } from '../reducers/calculatorReducer';

interface HistoryProps {
  entries: HistoryEntry[];
  onSelect: (value: number) => void;
  onClear: () => void;
}

export function History({ entries, onSelect, onClear }: HistoryProps) {
  return (
    <section aria-labelledby="history-title" className="flex flex-col rounded-3xl bg-slate-800 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="history-title" className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
          History
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No calculations yet.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.result)}
                title="Use this result"
                className="w-full rounded-lg px-3 py-2 text-right hover:bg-slate-700"
              >
                <span className="block text-sm text-slate-400">{entry.expression} =</span>
                <span className="block truncate text-lg text-white tabular-nums">{formatNumber(entry.result)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
