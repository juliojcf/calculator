import { ApiError, type ApiErrorCode } from '../api/client';

const MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  division_by_zero: 'Cannot divide by zero',
  negative_sqrt: 'No square root of a negative number',
  undefined_result: 'Result is undefined',
  overflow: 'Result is too large',
  invalid_input: 'Invalid number',
  network_error: 'Server unavailable, try again',
};

/** Turns any failure from the API client into a short message for the display. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? 'Something went wrong';
  }
  return 'Something went wrong';
}
