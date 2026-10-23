# Calculator UI (React + TypeScript)

A keypad calculator built with React 19, TypeScript, Vite and Tailwind CSS.
Every calculation is performed by the [Go backend](../backend/README.md);
the UI handles input, display, errors and history.

## Requirements

- Node.js 24+ (`.nvmrc` is provided: run `nvm use`)
- The backend running on `http://localhost:8080` for local development

## Running

```bash
npm install
npm run dev         # http://localhost:5173
```

The dev server proxies `/api/*` to `http://localhost:8080`. To point it at
another backend, set `API_URL`, e.g. `API_URL=http://localhost:9000 npm run dev`.

| Script                 | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                      |
| `npm run build`        | Type-check and build to `dist/`                 |
| `npm run preview`      | Serve the production build locally              |
| `npm test`             | Run the test suite once                         |
| `npm run test:watch`   | Re-run tests on file changes                    |
| `npm run coverage`     | Tests + coverage report (`coverage/index.html`) |
| `npm run lint`         | Lint with oxlint                                |
| `npm run format`       | Format all files with Prettier                  |
| `npm run format:check` | Check formatting without changing files         |

With Docker, the app is built and served by nginx, which also forwards `/api`
to the backend. Use `docker compose up --build` from the repository root.

## Usage

Click the keys or use the keyboard:

| Key                      | Action                      |
| ------------------------ | --------------------------- |
| `0`–`9`, `.` or `,`      | Enter a number              |
| `+` `-` `*` (or `x`) `/` | Basic operators             |
| `^`                      | Power                       |
| `%`                      | Percent of (`20 % 50` = 10) |
| `s`                      | Square root                 |
| `n`                      | Toggle sign (±)             |
| `Enter` or `=`           | Equals                      |
| `Backspace`              | Delete last digit           |
| `Esc` or `Delete`        | Clear                       |

The last 10 calculations are listed in the history panel; click one to reuse
its result.

## Project layout

```
src/
  api/client.ts                  typed HTTP client, ApiError with backend error codes
  components/                    Calculator, Display, Keypad, History
  hooks/useCalculator.ts         connects the reducer to the API
  hooks/useKeyboard.ts           physical keyboard support
  reducers/calculatorReducer.ts  pure reducer: keypad state machine (no React, no I/O)
  utils/format.ts                number formatting and expression labels
  utils/errorMessages.ts         API error code -> user-facing message
```

Files are grouped by kind (components, hooks, reducers, utils). Tests sit next
to the file they test.

## Testing

Tests use [Vitest](https://vitest.dev) and
[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

- **Unit tests**: number formatting, the reducer (every key and edge case),
  and the API client against a fake `fetch` (success, API errors, network
  failure, malformed responses).
- **Component tests**: render the whole calculator and drive it like a user,
  by clicking keys and typing on the keyboard. The API is replaced by an
  in-memory fake, so no backend is needed.

54 tests, coverage: **96.6% statements, 94.7% branches, 97.5% lines**.
`App.tsx` (wiring only) is the only file without tests.

## Design decisions

- **Immediate execution.** Like a basic pocket calculator (or Windows
  Calculator in Standard mode), each operator applies to the running total:
  `3 + 5 × 2 =` gives `16`. Operator precedence and parentheses would need an
  expression parser; the cleanest place for it would be a backend
  `/evaluate` endpoint. That was left out to keep the scope focused.
- **All arithmetic runs on the backend.** The UI never computes results; it
  only decides _when_ to call the API (on `=`, when chaining operators, or on
  `√`).
- **The state machine is a pure reducer.** Key handling is a function
  `(state, action) → state`, tested without rendering anything. The hook
  only does I/O, so the reducer stays deterministic.
- **The API client is injected.** `<Calculator api={...} />` receives the
  client, so tests pass a fake instead of mocking global `fetch`.
- **Display rounding.** Results are shown with 12 significant digits, which
  hides floating-point noise (`0.1 + 0.2` shows `0.3`). The full-precision
  value is kept for further calculations.
- **Input validation.** The keypad only produces valid numbers: one decimal
  point, at most 15 digits, and an incomplete expression (`5 + =`) is not sent.
  Errors from the backend (division by zero, overflow, …) and network failures
  are mapped to short messages, and the next key press starts over.
- **Same-origin API calls.** The app always calls `/api/v1/...`. In
  development Vite proxies it and in Docker nginx does, so there is no API URL
  baked into the bundle and no CORS setup is needed.
- **Accessibility.** Keys have descriptive labels, the active operator uses
  `aria-pressed`, and the result is an `aria-live` region.
