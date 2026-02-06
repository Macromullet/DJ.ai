/**
 * API key validation utilities.
 * Makes a minimal API call per provider to confirm the key is accepted.
 * Routes through the Electron IPC proxy when available (avoids CORS),
 * with a direct fetch fallback for browser dev mode.
 */

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const makeRequest = window.electron?.aiProxy?.request;
    if (makeRequest) {
      const result = await makeRequest({
        url: 'https://api.openai.com/v1/models',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return result.ok;
    } else {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.ok;
    }
  } catch {
    return false;
  }
}

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  // Anthropic has no cheap list endpoint; use a 1-token message instead.
  try {
    const makeRequest = window.electron?.aiProxy?.request;
    const body = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    };

    if (makeRequest) {
      // Pass body as object — the IPC handler serialises it with JSON.stringify.
      const result = await makeRequest({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body,
      });
      return result.ok;
    } else {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return response.ok;
    }
  } catch {
    return false;
  }
}
