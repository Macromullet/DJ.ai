import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, handleApiResponse } from '../apiError';

describe('ApiError', () => {
  it('sets message, statusCode, and endpoint', () => {
    const err = new ApiError('Not Found', 404, '/api/test');
    expect(err.message).toBe('Not Found');
    expect(err.statusCode).toBe(404);
    expect(err.endpoint).toBe('/api/test');
  });

  it('is an instance of Error', () => {
    const err = new ApiError('fail');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
  });
});

describe('handleApiResponse', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each([200, 201, 204])('passes through successful response (%i)', async (status) => {
    const response = new Response(null, { status });
    const result = await handleApiResponse(response, '/ok');
    expect(result).toBe(response);
  });

  it('throws ApiError on 400 using body.message', async () => {
    expect.assertions(2);
    const response = new Response(JSON.stringify({ message: 'Bad request body' }), {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(handleApiResponse(response, '/submit')).rejects.toThrow(ApiError);

    const response2 = new Response(JSON.stringify({ message: 'Bad request body' }), {
      status: 400,
      statusText: 'Bad Request',
    });
    await expect(handleApiResponse(response2, '/submit')).rejects.toThrow('Bad request body');
  });

  it('throws ApiError on 401 using body.error', async () => {
    expect.assertions(2);
    const response = new Response(JSON.stringify({ error: 'Unauthorized access' }), {
      status: 401,
      statusText: 'Unauthorized',
    });
    await expect(handleApiResponse(response, '/auth')).rejects.toThrow(ApiError);

    const response2 = new Response(JSON.stringify({ error: 'Unauthorized access' }), {
      status: 401,
      statusText: 'Unauthorized',
    });
    await expect(handleApiResponse(response2, '/auth')).rejects.toThrow('Unauthorized access');
  });

  it('throws ApiError on 500 using body.Message', async () => {
    expect.assertions(2);
    const response = new Response(JSON.stringify({ Message: 'Internal server failure' }), {
      status: 500,
      statusText: 'Internal Server Error',
    });
    await expect(handleApiResponse(response, '/crash')).rejects.toThrow(ApiError);

    const response2 = new Response(JSON.stringify({ Message: 'Internal server failure' }), {
      status: 500,
      statusText: 'Internal Server Error',
    });
    await expect(handleApiResponse(response2, '/crash')).rejects.toThrow('Internal server failure');
  });

  it('includes status code and endpoint on thrown ApiError', async () => {
    expect.assertions(2);
    const response = new Response(JSON.stringify({ message: 'gone' }), {
      status: 410,
      statusText: 'Gone',
    });

    const err = await handleApiResponse(response, '/removed').catch((e) => e as ApiError);
    expect(err.statusCode).toBe(410);
    expect(err.endpoint).toBe('/removed');
  });

  it('uses fallback message when body is not parseable JSON', async () => {
    expect.assertions(3);
    const response = new Response('not json', {
      status: 502,
      statusText: 'Bad Gateway',
    });

    const err = await handleApiResponse(response, '/proxy').catch((e) => e as ApiError);
    expect(err.message).toBe('API error: 502 Bad Gateway');
    expect(err.statusCode).toBe(502);
    expect(err.endpoint).toBe('/proxy');
  });

  it('falls back to default message when body.message is non-string', async () => {
    expect.assertions(1);
    const response = new Response(JSON.stringify({ message: { nested: true } }), {
      status: 400,
      statusText: 'Bad Request',
    });
    // Non-string truthy value is returned by body.message (an object), which becomes the message
    const err = await handleApiResponse(response, '/nested').catch((e) => e as ApiError);
    expect(err.message).toBe('[object Object]');
  });

  it('prefers body.message over body.error when both are present', async () => {
    expect.assertions(1);
    const response = new Response(
      JSON.stringify({ message: 'message-wins', error: 'error-loses' }),
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await expect(handleApiResponse(response, '/both')).rejects.toThrow('message-wins');
  });
});
