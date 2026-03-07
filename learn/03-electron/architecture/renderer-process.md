# The Renderer Process

## What Is a Renderer Process?

Each `BrowserWindow` in Electron creates its own renderer process — an isolated Chromium browser instance that renders web content. If you've built websites, the renderer is familiar territory: it's where HTML, CSS, and JavaScript run, where the DOM lives, and where frameworks like React operate.

The critical difference from a regular browser tab is that renderers in Electron **can communicate with the main process** via IPC — but only through the carefully controlled bridge established by preload scripts.

## Security Sandboxing

By default, renderer processes are **sandboxed**. They cannot:
- Access the file system directly
- Spawn child processes
- Use Node.js built-in modules (`fs`, `path`, `crypto`, etc.)
- Interact with the operating system

This is intentional. Renderer processes load web content — potentially from external URLs — so they must be treated as untrusted. The sandbox prevents malicious scripts from escaping the browser context.

```javascript
// In the main process — security settings for a BrowserWindow
const win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,   // No require() in renderer
    contextIsolation: true,   // Separate JS worlds
    sandbox: true,            // Chromium sandbox enabled
    preload: 'preload.cjs'   // Only bridge to main process
  }
});
```

## What Runs in the Renderer

The renderer process handles everything visual:
- **React components** — UI rendering and state management
- **CSS styles** — layout, animations, theming
- **User interactions** — click handlers, form inputs, drag-and-drop
- **Web APIs** — `fetch()`, `localStorage`, `AudioContext`, `Canvas`
- **Communication** — calling main process via `window.electron.*`

## Renderer-to-Main Communication

The renderer accesses main-process capabilities only through the preload-exposed API:

```typescript
// In a React component (renderer process)
const encrypted = await window.electron.safeStorage.encrypt(apiKey);
```

These calls are transparently routed through IPC to the main process.

## Key Links

- [The Renderer Process](https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process)
- [Web APIs available in Electron](https://www.electronjs.org/docs/latest/api/web-contents)
- [Chromium Sandbox Design](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/design/sandbox.md)

## Key Takeaways

- Each window gets its own **isolated Chromium renderer process**
- Renderers are **sandboxed** — no direct Node.js or OS access
- Communication with the main process happens **only through the preload bridge**
- All web APIs (`fetch`, `localStorage`, `Canvas`) work normally

## DJ.ai Connection

DJ.ai's primary renderer process runs the entire React application from `electron-app/src/`. This includes the music player UI, settings panel, onboarding wizard, AI commentary display, and provider management. The React app uses `window.electron.aiProxy.*` for AI commentary and `window.electron.safeStorage.*` for encrypting API keys — all of which are IPC calls to the main process, invisible to the React code.
