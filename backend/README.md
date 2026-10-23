# Calculator API (Go)

A small REST microservice that performs arithmetic operations and returns JSON.
Built with the Go standard library only — no third-party dependencies.

## Requirements

- Go 1.25+ (or Docker)

## Running

```bash
make run            # or: go run ./cmd/server
```

The server listens on `:8080` by default.

| Variable          | Default                 | Description                                   |
| ----------------- | ----------------------- | --------------------------------------------- |
| `PORT`            | `8080`                  | Port to listen on                             |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins, or `*` for any  |

With Docker:

```bash
docker build -t calculator-backend .
docker run --rm -p 8080:8080 calculator-backend
```

To run it together with the frontend, use `docker compose up --build` from the
repository root.

## Testing

```bash
make test           # go test -race ./...
make cover          # coverage summary + coverage.html report
make lint           # gofmt + go vet
```

Coverage: `internal/calculator` **100%**, `internal/api` **95.3%** (96.1% total).
The remaining lines in `internal/api` are defensive branches that HTTP cannot
reach: `NaN`/`Inf` operands (JSON cannot encode them), an unknown error mapped
to 500, and a failed response write. `cmd/server` only wires configuration and
is not unit-tested.

## API

All operations are `POST` requests with a JSON body. Operands are JSON numbers.

| Endpoint                  | Body               | Result          |
| ------------------------- | ------------------ | --------------- |
| `POST /api/v1/add`        | `{"a": 2, "b": 3}` | `a + b`         |
| `POST /api/v1/subtract`   | `{"a": 2, "b": 3}` | `a - b`         |
| `POST /api/v1/multiply`   | `{"a": 2, "b": 3}` | `a × b`         |
| `POST /api/v1/divide`     | `{"a": 2, "b": 3}` | `a ÷ b`         |
| `POST /api/v1/power`      | `{"a": 2, "b": 3}` | `a ^ b`         |
| `POST /api/v1/percentage` | `{"a": 2, "b": 3}` | `a% of b`, i.e. `a / 100 × b` |
| `POST /api/v1/sqrt`       | `{"a": 9}`         | `√a`            |
| `GET /healthz`            | —                  | `{"status":"ok"}` |

### Success

```bash
curl -X POST localhost:8080/api/v1/divide \
  -H 'Content-Type: application/json' \
  -d '{"a": 10, "b": 4}'
```

```json
HTTP/1.1 200 OK
{"operation":"divide","result":2.5}
```

### Errors

Every error has the same shape, with a stable `code` for clients to switch on
and a human-readable `message`:

```bash
curl -X POST localhost:8080/api/v1/divide -d '{"a": 1, "b": 0}'
```

```json
HTTP/1.1 422 Unprocessable Entity
{"error":{"code":"division_by_zero","message":"division by zero"}}
```

| Status | Code                 | When                                                                 |
| ------ | -------------------- | -------------------------------------------------------------------- |
| 400    | `invalid_json`       | Empty, malformed or oversized body; unknown fields; trailing data    |
| 400    | `invalid_input`      | Missing/`null` operand, non-numeric operand, number beyond float64   |
| 422    | `division_by_zero`   | `divide` with `b = 0`                                                |
| 422    | `negative_sqrt`      | `sqrt` with `a < 0`                                                  |
| 422    | `undefined_result`   | No real result, e.g. `power` with `a = -8, b = 0.5`                  |
| 422    | `overflow`           | Result exceeds float64 range, e.g. `power` with `a = 10, b = 400`    |
| 404    | `not_found`          | Unknown route                                                        |
| 405    | `method_not_allowed` | Non-`POST` request to an operation (response includes `Allow: POST`) |
| 500    | `internal_error`     | Unexpected failure (e.g. a recovered panic)                          |

## Project layout

```
cmd/server/            entry point: config, HTTP server, graceful shutdown
internal/calculator/   pure arithmetic + domain errors (no HTTP)
internal/api/          routing, JSON decoding/validation, error mapping, middleware
```

## Design decisions

- **One endpoint per operation.** Explicit, self-documenting routes that are
  easy to test and to evolve independently. Adding an operation is one function
  in `calculator` and one line in the route table.
- **Standard library only.** Go 1.22+ `ServeMux` supports method-based
  patterns, which is all this service needs; fewer dependencies means less to
  audit and maintain.
- **Domain logic is isolated from transport.** `internal/calculator` knows
  nothing about HTTP; it returns sentinel errors (`ErrDivisionByZero`, …) that
  the API layer maps to status codes and error codes in one place.
- **`float64` numbers.** They map directly to JSON/JavaScript numbers. The
  service never returns `NaN`, `±Inf` or `-0`: special IEEE-754 values are
  turned into explicit errors. Display-level rounding (e.g. `0.1 + 0.2`) is
  left to the client.
- **400 vs 422.** 400 means the request itself is wrong (bad JSON, missing
  fields). 422 means the request is valid but the values have no finite real
  result.
- **Strict input.** Unknown fields, trailing data and bodies over 1 KiB are
  rejected; missing operands are detected via pointer fields, so `0` is a valid
  value while an absent field is an error.
- **Operational basics.** Structured JSON logs (`log/slog`), panic recovery,
  configurable CORS for the React dev server, server timeouts, graceful
  shutdown on `SIGINT`/`SIGTERM`, and a `/healthz` endpoint for containers.
