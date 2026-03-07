# Performance Optimization

## The Concept

Performance optimization in a desktop music app means:
- **Instant UI responses** — No perceived lag when clicking buttons or switching tracks
- **Efficient memory use** — No leaks during long listening sessions (hours)
- **Small download size** — Fast installation, minimal disk usage
- **Smart resource loading** — Don't load what you don't need yet

## Performance in DJ.ai

DJ.ai applies optimization at three levels:

| Level | Techniques | Files |
|-------|-----------|-------|
| **Runtime** | Prefetching, lazy loading, debouncing | Components, services |
| **Memory** | Blob URL cleanup, ref-based state | TTS services, MusicPlayer |
| **Build** | Tree shaking, code splitting, minification | Vite config |

## Learning Path

| File | Topic |
|------|-------|
| [prefetch-look-ahead.md](./prefetch-look-ahead.md) | Pre-generating next track's commentary |
| [blob-url-lifecycle.md](./blob-url-lifecycle.md) | Memory-safe Blob URL patterns |
| [bundle-optimization.md](./bundle-optimization.md) | Vite build optimization |

## Key Takeaways

- Prefetching eliminates perceived latency by doing work before it's needed
- Memory management is critical in long-running desktop apps
- Tree shaking removes unused code — but only if you use ES modules
- Measure before optimizing — premature optimization wastes development time

## Further Reading

- [web.dev: Performance](https://web.dev/performance/)
- [Chrome DevTools: Performance](https://developer.chrome.com/docs/devtools/performance/)
