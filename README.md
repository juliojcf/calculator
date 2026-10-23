# Full-Stack Calculator

A calculator with a **React + TypeScript** frontend and a **Go** REST
microservice. The frontend handles input and display; every calculation is
performed by the backend API.

Operations: addition, subtraction, multiplication, division, power, square
root and percentage.

```
┌───────────────────────┐   POST /api/v1/{operation}   ┌─────────────────────┐
│ frontend (React)      │ ───────────────────────────▶ │ backend (Go)        │
│ Vite dev / nginx      │ ◀─────────────────────────── │ net/http, JSON      │
└───────────────────────┘     {"result": 42}           └─────────────────────┘
```

| Part                             | Stack                                          | Details                    |
| -------------------------------- | ---------------------------------------------- | -------------------------- |
| [`backend/`](backend/README.md)  | Go 1.25, standard library only                 | API reference, error codes |
| [`frontend/`](frontend/README.md)| React 19, TypeScript, Vite, Tailwind CSS 4     | Keyboard shortcuts, UI design |

## Quick start (Docker)

Requires Docker with Compose.

```bash
docker compose up --build
```

- App: http://localhost:3000
- API: http://localhost:8080 (also reachable through the app at `/api`)

Stop with `docker compose down`.

## Running locally

Requirements: **Go 1.25+** and **Node.js 24+**.

**1. Backend** (terminal 1)

```bash
cd backend
go run ./cmd/server         # listens on :8080
```

**2. Frontend** (terminal 2)

```bash
cd frontend
nvm use                     # optional, selects Node 24 from .nvmrc
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server forwards `/api` to the backend on port 8080.

## API examples

All operations are `POST` requests with JSON operands `a` and `b` (`sqrt`
takes only `a`). See the [backend README](backend/README.md#api) for the full
reference.

```bash
curl -X POST localhost:8080/api/v1/add -H 'Content-Type: application/json' -d '{"a": 2, "b": 3}'
# 200 {"operation":"add","result":5}

curl -X POST localhost:8080/api/v1/percentage -H 'Content-Type: application/json' -d '{"a": 20, "b": 50}'
# 200 {"operation":"percentage","result":10}

curl -X POST localhost:8080/api/v1/sqrt -H 'Content-Type: application/json' -d '{"a": 2}'
# 200 {"operation":"sqrt","result":1.4142135623730951}

curl -X POST localhost:8080/api/v1/divide -H 'Content-Type: application/json' -d '{"a": 1, "b": 0}'
# 422 {"error":{"code":"division_by_zero","message":"division by zero"}}

curl -X POST localhost:8080/api/v1/add -H 'Content-Type: application/json' -d '{"a": 1}'
# 400 {"error":{"code":"invalid_input","message":"fields \"a\" and \"b\" are required"}}
```

| Endpoint                  | Operation   | Endpoint                | Operation  |
| ------------------------- | ----------- | ----------------------- | ---------- |
| `POST /api/v1/add`        | `a + b`     | `POST /api/v1/power`    | `a ^ b`    |
| `POST /api/v1/subtract`   | `a − b`     | `POST /api/v1/percentage` | `a% of b` |
| `POST /api/v1/multiply`   | `a × b`     | `POST /api/v1/sqrt`     | `√a`       |
| `POST /api/v1/divide`     | `a ÷ b`     | `GET /healthz`          | health check |

## Tests and coverage

```bash
cd backend && make cover        # coverage summary + backend/coverage.html
cd frontend && npm run coverage # coverage table + frontend/coverage/index.html
```

| Layer    | Package / area                 | Statement coverage |
| -------- | ------------------------------ | ------------------ |
| Backend  | `internal/calculator`          | 100%               |
| Backend  | `internal/api`                 | 95.3%              |
| Backend  | **total**                      | **96.1%**          |
| Frontend | **total** (54 tests)           | **96.6%** (97.5% of lines) |

- **Backend:** table-driven unit tests for every operation and edge case
  (overflow, `NaN`, `-0`, negative roots), plus HTTP handler tests with
  `httptest` covering status codes, error codes, malformed JSON, CORS and
  panic recovery. The uncovered lines are defensive branches that cannot be
  reached through HTTP, such as an unknown error mapped to 500.
- **Frontend:** unit tests for the keypad reducer, number formatting and the
  API client (with a fake `fetch`), plus component tests that click keys and
  type on the keyboard against an in-memory fake API.

Coverage reports are generated files and are not committed; the commands
above recreate them.

## Design decisions and assumptions

**Architecture**
- **One endpoint per operation.** Explicit routes that are easy to document,
  test and extend. Adding an operation takes one function and one route entry.
- **Domain logic is isolated from transport.** In Go, `internal/calculator`
  knows nothing about HTTP. In React, the keypad is a pure reducer, separate
  from the components and the API client.
- **Same-origin API.** The browser always calls `/api/...`. Vite (dev) and
  nginx (Docker) proxy it to the backend, so there is no URL baked into the
  bundle and no CORS is needed. CORS is still configurable on the backend
  (`ALLOWED_ORIGINS`) for direct access.
- **Minimal dependencies.** The backend uses only the Go standard library.

**Behavior**
- **Numbers are IEEE-754 `float64`**, matching JSON and JavaScript numbers.
  The API never returns `NaN`, `±Infinity` or `-0`; those cases become explicit
  errors. The UI rounds results to 12 significant digits for display, so
  `0.1 + 0.2` shows as `0.3`.
- **400 vs 422.** 400 means a malformed request (bad JSON, missing operand).
  422 means valid input with no finite real result (division by zero, √ of a
  negative number, overflow).
- **Percentage is "a percent of b"**: `20 % 50 = 10`.
- **Immediate execution.** Like a basic pocket calculator, each operator
  applies to the running total: `3 + 5 × 2 = 16`. Precedence and parentheses
  would require an expression parser, ideally a backend `/evaluate`
  endpoint. That was a deliberate scope cut.
- **History is per session.** It is kept in memory and is not persisted.

## Repository layout

```
backend/              Go REST API (see backend/README.md)
frontend/             React app (see frontend/README.md)
docker-compose.yml    full stack: backend + nginx-served frontend
PROMPTS.md            AI tooling used and the prompts that shaped the project
```

## AI usage

Built with Claude Code as a pair programmer. The prompts that shaped the
project, the design decisions made along the way, and a short reflection are
in [PROMPTS.md](PROMPTS.md).
