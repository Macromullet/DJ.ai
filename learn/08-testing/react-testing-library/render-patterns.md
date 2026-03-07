# React Testing Library — Render Patterns

## Concept

`render()` is the entry point for every React Testing Library test. It mounts a React component into a jsdom document and returns utilities for querying and interacting with the rendered output. Understanding render patterns — including cleanup, custom renderers, and prop strategies — is essential for maintainable component tests.

## Basic Render

```typescript
import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders the app heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'DJ.ai' })).toBeInTheDocument();
});
```

`screen` is the recommended way to query rendered output — it's globally available and doesn't require destructuring from `render()`.

## Render with Props

```typescript
test('displays provider name', () => {
  const mockProvider = {
    providerId: 'spotify',
    providerName: 'Spotify',
    isAuthenticated: true,
    // ... other IMusicProvider methods
  };

  render(<NowPlaying provider={mockProvider} track={mockTrack} />);

  expect(screen.getByText('Spotify')).toBeInTheDocument();
});
```

### Mock Props That Match Production Interfaces

DJ.ai components are typed with TypeScript interfaces. Test props should match these interfaces to catch type mismatches:

```typescript
// Use the actual interface type
const mockProviders: IMusicProvider[] = [
  {
    providerId: 'apple-music',
    providerName: 'Apple Music',
    isAuthenticated: false,
    authenticate: vi.fn(),
    searchTracks: vi.fn(),
    playTrack: vi.fn(),
    // ... all required interface methods
  }
];

render(<Settings providers={mockProviders} />);
```

## Cleanup

RTL automatically cleans up after each test when using Vitest with `globals: true`. The rendered DOM is unmounted and removed between tests.

```typescript
// Automatic cleanup (default with Vitest globals)
// No manual cleanup needed!

// Manual cleanup (if globals is false)
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
```

## Custom Render with Providers

When components need context providers (router, theme, state), create a custom render function:

```typescript
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}

function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { customRender as render };
```

Usage:

```typescript
import { render } from './test-utils';

test('navigates on button click', async () => {
  render(<OnboardingWizard />);
  // Component has access to router context
});
```

## Render Return Values

```typescript
const result = render(<App />);

result.container;     // The DOM element containing the rendered component
result.baseElement;   // The root DOM element (usually document.body)
result.debug();       // Print the DOM tree to console (debugging)
result.unmount();     // Manually unmount the component
result.rerender(<App newProp="value" />); // Re-render with new props
```

### Rerender Pattern

```typescript
test('updates when props change', () => {
  const { rerender } = render(<TrackDisplay track={trackA} />);

  expect(screen.getByText('Song A')).toBeInTheDocument();

  rerender(<TrackDisplay track={trackB} />);

  expect(screen.getByText('Song B')).toBeInTheDocument();
});
```

## act() for State Updates

When testing components that update state asynchronously:

```typescript
import { act } from '@testing-library/react';

test('loads data on mount', async () => {
  await act(async () => {
    render(<TrackList />);
  });

  // DOM is now updated after useEffect ran
  expect(screen.getByText('Track 1')).toBeInTheDocument();
});
```

Most RTL utilities (`userEvent`, `findBy`) wrap calls in `act()` automatically. You only need explicit `act()` for direct state manipulation or unusual async patterns.

## Key Takeaways

- Use `screen` for queries (globally available, no destructuring needed)
- Mock props should match TypeScript interfaces to catch type errors
- Automatic cleanup handles DOM teardown between tests
- Custom render functions wrap components with required providers
- `rerender()` tests prop change behavior without full remount

## DJ.ai Connection

DJ.ai component tests render with mock props that match production `IMusicProvider`, `ITTSService`, and `IAICommentaryService` interfaces. This ensures that type mismatches between components and their dependencies are caught during testing, not at runtime. The `rerender()` pattern is used to test provider switching and track change scenarios.

## Further Reading

- [RTL Render API](https://testing-library.com/docs/react-testing-library/api#render)
- [RTL Setup — Custom Render](https://testing-library.com/docs/react-testing-library/setup#custom-render)
- [act() in React Testing](https://react.dev/reference/react/act)
