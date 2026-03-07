# Inter-Process Communication (IPC)

## Overview

IPC is how Electron's processes talk to each other. Since the main process and renderer processes run in separate OS processes with isolated memory, they need a messaging system to coordinate. Electron provides several IPC patterns, each suited to different use cases.

## IPC Patterns

| Pattern | Direction | Style | Use Case |
|---------|-----------|-------|----------|
| `invoke` / `handle` | Renderer → Main | Async request-response | Fetching data, performing operations |
| `send` / `on` | Renderer → Main | Fire-and-forget | Logging, UI notifications |
| `webContents.send` | Main → Renderer | Push notifications | System tray events, deep links |
| `MessagePort` | Any ↔ Any | Bidirectional channel | Streaming data, binary transfers |

## Choosing the Right Pattern

**Use `invoke`/`handle` when:**
- You need a response (e.g., encrypt a string, fetch track info)
- The operation might fail (errors propagate through the Promise)
- You want async/await syntax

**Use `send`/`on` when:**
- You don't need a response (e.g., log an event, update tray)
- Broadcasting from main to renderer (e.g., media key pressed)

**Use MessagePorts when:**
- Transferring binary data efficiently
- Creating persistent bidirectional channels

## Topics in This Section

| Topic | Description |
|-------|-------------|
| [invoke / handle](./invoke-handle.md) | Async request-response (most common) |
| [send / on](./send-on.md) | One-way fire-and-forget messaging |
| [Binary Data](./binary-data.md) | Transferring audio and large payloads |

## Key Takeaways

- IPC is the **only way** processes communicate in Electron
- `invoke`/`handle` is the **preferred pattern** for most operations
- Main-to-renderer messages use `webContents.send()`
- All IPC is **asynchronous** — plan for it in your React state management

## DJ.ai Connection

DJ.ai uses all three IPC patterns extensively. The `invoke`/`handle` pattern powers the majority of features — AI requests, safe storage, and OAuth window creation all use this async request-response model. The `send`/`on` pattern handles system tray events (play/pause/next/previous) which flow from the main process to the renderer. Binary data transfer is used for TTS audio, where the main process fetches audio from AI APIs and returns base64-encoded data to the renderer for playback.
