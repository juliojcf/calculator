import { createApiClient } from './api/client';
import { Calculator } from './components/Calculator';

const api = createApiClient();

export default function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-slate-900 px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Calculator</h1>
      <Calculator api={api} />
      <p className="text-center text-xs text-slate-500">
        Keyboard: digits, + − * / ^ %, Enter (=), Backspace, Esc (clear), s (√), n (±)
      </p>
    </main>
  );
}
