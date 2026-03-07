# localStorage

> Client-side key-value storage — how DJ.ai persists settings, tokens, and preferences across sessions.

`localStorage` is a synchronous, origin-scoped key-value store built into every browser. DJ.ai uses it extensively to persist user data between app sessions: OAuth tokens, application settings, device tokens, volume levels, and onboarding status. Unlike cookies, localStorage data is never sent to the server — it stays on the client.

---

## Core Concepts

### Basic API

localStorage stores string key-value pairs with a simple API:

```typescript
// Store a value
localStorage.setItem('dj-ai-volume', '80');

// Retrieve a value (returns null if not found)
const volume = localStorage.getItem('dj-ai-volume');

// Remove a value
localStorage.removeItem('dj-ai-volume');

// Clear all values for this origin
localStorage.clear();
```

### Serialization with JSON

localStorage only stores strings. For objects and arrays, serialize with JSON:

```typescript
// Storing an object
const settings: SettingsConfig = {
  currentProvider: 'youtube',
  ttsEnabled: true,
  ttsProvider: 'web-speech',
  autoDJMode: false,
};
localStorage.setItem('dj-ai-settings', JSON.stringify(settings));

// Retrieving an object
const saved = localStorage.getItem('dj-ai-settings');
const settings = saved ? JSON.parse(saved) as SettingsConfig : defaultSettings;
```

### DJ.ai's localStorage Usage

DJ.ai stores several categories of data in localStorage:

**OAuth Tokens:**
```typescript
// After successful OAuth exchange
localStorage.setItem('spotify_access_token', tokens.accessToken);
localStorage.setItem('spotify_refresh_token', tokens.refreshToken);
localStorage.setItem('spotify_token_expiry', String(Date.now() + tokens.expiresIn * 1000));

// Reading tokens for API calls
const token = localStorage.getItem('spotify_access_token');
const expiry = Number(localStorage.getItem('spotify_token_expiry'));
if (Date.now() > expiry) {
  // Token expired — trigger refresh
}
```

**Application Settings:**
```typescript
// Persist on every change via useEffect
useEffect(() => {
  localStorage.setItem('dj-ai-settings', JSON.stringify(settings));
}, [settings]);

// Load on mount with lazy useState initializer
const [settings, setSettings] = useState<SettingsConfig>(() => {
  const saved = localStorage.getItem('dj-ai-settings');
  return saved ? JSON.parse(saved) : defaultSettings;
});
```

**Device Token:**
```typescript
// Generate a unique device identifier once
function getOrCreateDeviceToken(): string {
  let token = localStorage.getItem('device-token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('device-token', token);
  }
  return token;
}
```

**UI State:**
```typescript
// Volume level
localStorage.setItem('dj-ai-volume', String(volume));
const savedVolume = Number(localStorage.getItem('dj-ai-volume') ?? '80');

// Onboarding completed
localStorage.setItem('dj-ai-onboarding-complete', 'true');
const onboarded = localStorage.getItem('dj-ai-onboarding-complete') === 'true';
```

### Size Limits and Performance

| Property | Value |
|----------|-------|
| **Storage limit** | ~5-10 MB per origin (browser-dependent) |
| **API** | Synchronous (blocks the main thread) |
| **Scope** | Same origin (`http://localhost:5173`) |
| **Persistence** | Survives page reloads and browser restarts |
| **Shared** | Accessible from all tabs on the same origin |

**Performance note:** localStorage is synchronous — reads and writes block the main thread. For DJ.ai's small data volumes (a few KB), this is negligible. For large data (>100KB), consider `IndexedDB`.

### Security Considerations

localStorage is accessible to any JavaScript running on the same origin. DJ.ai addresses this through:

1. **Electron safeStorage** — API keys are encrypted before storage using Electron's OS-level keychain:
   ```typescript
   // Encrypt before storing
   const encrypted = await window.electron.safeStorage.encrypt(apiKey);
   localStorage.setItem('openai-api-key-enc', encrypted);

   // Decrypt when reading
   const encrypted = localStorage.getItem('openai-api-key-enc');
   const apiKey = await window.electron.safeStorage.decrypt(encrypted);
   ```

2. **OAuth tokens** — stored as plain strings (standard for desktop apps; the tokens are short-lived and refresh-able)

3. **Context isolation** — Electron's `contextIsolation: true` prevents renderer scripts from accessing the preload scope

### The React localStorage Sync Pattern

DJ.ai's standard pattern for persistent state:

```typescript
// 1. Load from localStorage on mount
const [value, setValue] = useState(() => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
});

// 2. Sync to localStorage on every change
useEffect(() => {
  localStorage.setItem(key, JSON.stringify(value));
}, [value]);
```

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — Persists `settings` to localStorage via `useEffect`; loads on mount via lazy `useState`
- **`electron-app/src/providers/YouTubeMusicProvider.ts`** — Stores/reads OAuth tokens and expiry timestamps
- **`electron-app/src/providers/SpotifyProvider.ts`** — Same token persistence pattern
- **`electron-app/src/utils/secretStorage.ts`** — Wraps Electron `safeStorage` for encrypting API keys stored in localStorage
- **`electron-app/src/components/VolumeControl.tsx`** — Persists volume level
- **`electron-app/src/components/OnboardingWizard.tsx`** — Stores onboarding completion status
- **`electron-app/src/config/bootstrap.ts`** — Reads settings and test mode flag from localStorage during initialization

---

## 🎯 Key Takeaways

- localStorage is **synchronous** key-value storage with ~5-10 MB limit per origin
- DJ.ai stores **OAuth tokens**, **settings**, **device token**, **volume**, and **UI state**
- Always **`JSON.stringify()`** objects before storing and **`JSON.parse()`** when reading
- Use **lazy `useState` initializer** to load from localStorage once on mount
- Use **`useEffect`** to sync state changes back to localStorage
- **Encrypt sensitive data** (API keys) with Electron's `safeStorage` before storing
- localStorage data **never leaves the client** — it's not sent to the server like cookies

---

## 📖 Resources

- [Window.localStorage (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — Official API reference
- [Using the Web Storage API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API) — Tutorial
- [Web Storage API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) — Overview (localStorage + sessionStorage)
