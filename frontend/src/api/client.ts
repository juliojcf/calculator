// HTTP client for the calculator REST API (see backend/README.md).

export type BinaryOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'percentage';
export type UnaryOperation = 'sqrt';
export type Operation = BinaryOperation | UnaryOperation;

/** The calculator operations the UI depends on. Injected so tests can fake it. */
export interface CalculatorApi {
  binary(operation: BinaryOperation, a: number, b: number): Promise<number>;
  unary(operation: UnaryOperation, a: number): Promise<number>;
}

/** Error codes returned by the backend, plus client-side failures. */
export type ApiErrorCode =
  | 'invalid_json'
  | 'invalid_input'
  | 'division_by_zero'
  | 'negative_sqrt'
  | 'undefined_result'
  | 'overflow'
  | 'not_found'
  | 'method_not_allowed'
  | 'internal_error'
  | 'network_error'
  | 'bad_response';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface ResultBody {
  operation: string;
  result: number;
}

interface ErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export function createApiClient(baseUrl = '/api/v1', fetchFn: typeof fetch = fetch): CalculatorApi {
  async function post(operation: Operation, body: Record<string, number>): Promise<number> {
    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}/${operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ApiError('network_error', 'Could not reach the server');
    }

    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (isErrorBody(data)) {
        throw new ApiError(data.error.code, data.error.message, response.status);
      }
      throw new ApiError('bad_response', `Unexpected response (HTTP ${response.status})`, response.status);
    }
    if (!isResultBody(data)) {
      throw new ApiError('bad_response', 'Unexpected response from the server', response.status);
    }
    return data.result;
  }

  return {
    binary: (operation, a, b) => post(operation, { a, b }),
    unary: (operation, a) => post(operation, { a }),
  };
}

function isResultBody(data: unknown): data is ResultBody {
  return typeof data === 'object' && data !== null && typeof (data as ResultBody).result === 'number';
}

function isErrorBody(data: unknown): data is ErrorBody {
  if (typeof data !== 'object' || data === null) return false;
  const error = (data as ErrorBody).error;
  return typeof error === 'object' && error !== null && typeof error.code === 'string';
}
