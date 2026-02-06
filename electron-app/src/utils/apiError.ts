/**
 * Standardized error handling for OAuth proxy API calls.
 *
 * Use `handleApiResponse` for all fetch calls to the oauth-proxy backend
 * so that error messages from the structured { error, message } response
 * body are surfaced consistently.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleApiResponse(response: Response, endpoint: string): Promise<Response> {
  if (!response.ok) {
    let message = `API error: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = body.message || body.error || body.Message || message;
    } catch {
      // response body wasn't JSON — keep the default message
    }
    console.error(`[${endpoint}] ${message}`);
    throw new ApiError(message, response.status, endpoint);
  }
  return response;
}
