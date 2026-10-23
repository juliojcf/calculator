import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('createApiClient', () => {
  it('posts both operands and returns the result', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(200, { operation: 'divide', result: 2.5 }));
    const api = createApiClient('/api/v1', fetchFn);

    await expect(api.binary('divide', 10, 4)).resolves.toBe(2.5);
    expect(fetchFn).toHaveBeenCalledWith('/api/v1/divide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 10, b: 4 }),
    });
  });

  it('posts a single operand for unary operations', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(200, { operation: 'sqrt', result: 3 }));
    const api = createApiClient('/api/v1', fetchFn);

    await expect(api.unary('sqrt', 9)).resolves.toBe(3);
    expect(fetchFn.mock.calls[0][1].body).toBe(JSON.stringify({ a: 9 }));
  });

  it('throws the API error code and message', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(422, { error: { code: 'division_by_zero', message: 'division by zero' } }));
    const api = createApiClient('/api/v1', fetchFn);

    const error = await api.binary('divide', 1, 0).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'division_by_zero', message: 'division by zero', status: 422 });
  });

  it('reports network failures', async () => {
    const api = createApiClient('/api/v1', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.binary('add', 1, 2)).rejects.toMatchObject({ code: 'network_error' });
  });

  it('reports error responses that are not JSON', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 }));
    const api = createApiClient('/api/v1', fetchFn);
    await expect(api.binary('add', 1, 2)).rejects.toMatchObject({ code: 'bad_response', status: 502 });
  });

  it('reports successful responses with an unexpected body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(200, { value: 3 }));
    const api = createApiClient('/api/v1', fetchFn);
    await expect(api.binary('add', 1, 2)).rejects.toMatchObject({ code: 'bad_response' });
  });
});
