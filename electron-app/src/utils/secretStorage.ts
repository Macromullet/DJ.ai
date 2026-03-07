/**
 * Secret Storage Utility
 *
 * Uses Electron safeStorage API for proper encryption when available.
 * Falls back to plaintext localStorage in browser dev mode.
 */

const SECRETS_KEY = 'djai_secrets_encrypted';
const PLAIN_KEY = 'djai_secrets_plain';
const LEGACY_KEY = 'djai_secrets';

export interface ApiKeys {
  openaiApiKey: string;
  anthropicApiKey: string;
  elevenLabsApiKey: string;
  geminiApiKey: string;
}

const DEFAULT_KEYS: ApiKeys = {
  openaiApiKey: '',
  anthropicApiKey: '',
  elevenLabsApiKey: '',
  geminiApiKey: '',
};

async function isElectronSafeStorageAvailable(): Promise<boolean> {
  try {
    return await (window as any).electron?.safeStorage?.isAvailable() ?? false;
  } catch {
    return false;
  }
}

/**
 * Returns true when running in browser dev mode (e.g., http://localhost).
 * In packaged Electron, the protocol is 'file:' or a custom scheme.
 */
function isBrowserDevMode(): boolean {
  return window.location.protocol.startsWith('http');
}

export async function saveApiKeys(keys: Record<string, string>): Promise<void> {
  const json = JSON.stringify(keys);
  if (await isElectronSafeStorageAvailable()) {
    const encrypted = await (window as any).electron.safeStorage.encrypt(json);
    localStorage.setItem(SECRETS_KEY, encrypted);
  } else if (isBrowserDevMode()) {
    // Plaintext fallback is acceptable in browser dev mode only (http://localhost)
    console.warn('safeStorage not available — storing keys unencrypted (dev mode only)');
    localStorage.setItem(PLAIN_KEY, json);
  } else {
    throw new Error(
      'Cannot save API keys: safeStorage is unavailable in packaged mode. ' +
      'Plaintext fallback is disabled for security.'
    );
  }
}

export async function getApiKeys(): Promise<ApiKeys> {
  try {
    if (await isElectronSafeStorageAvailable()) {
      const encrypted = localStorage.getItem(SECRETS_KEY);
      if (!encrypted) {
        // Migrate from legacy unencrypted storage
        const legacy = localStorage.getItem(LEGACY_KEY) || localStorage.getItem(PLAIN_KEY);
        if (legacy) {
          const keys = { ...DEFAULT_KEYS, ...JSON.parse(legacy) };
          await saveApiKeys(keys);
          localStorage.removeItem(LEGACY_KEY);
          localStorage.removeItem(PLAIN_KEY);
          return keys;
        }
        return { ...DEFAULT_KEYS };
      }
      const json = await (window as any).electron.safeStorage.decrypt(encrypted);
      return { ...DEFAULT_KEYS, ...JSON.parse(json) };
    } else if (isBrowserDevMode()) {
      const plain = localStorage.getItem(PLAIN_KEY) || localStorage.getItem(LEGACY_KEY);
      return plain ? { ...DEFAULT_KEYS, ...JSON.parse(plain) } : { ...DEFAULT_KEYS };
    } else {
      throw new Error(
        'Cannot load API keys: safeStorage is unavailable in packaged mode. ' +
        'Plaintext fallback is disabled for security.'
      );
    }
  } catch (error) {
    console.error('Failed to load API keys:', error);
    return { ...DEFAULT_KEYS };
  }
}

export async function clearApiKeys(): Promise<void> {
  localStorage.removeItem(SECRETS_KEY);
  localStorage.removeItem(PLAIN_KEY);
  localStorage.removeItem(LEGACY_KEY);
}
