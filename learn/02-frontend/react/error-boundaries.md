# Error Boundaries

> Catching rendering errors gracefully — DJ.ai's safety net for unexpected failures.

An Error Boundary is a React component that catches JavaScript errors during rendering, in lifecycle methods, and in constructors of the whole tree below it. It displays a fallback UI instead of crashing the entire app. DJ.ai wraps its entire component tree in an `ErrorBoundary` to ensure that a bug in one component (like the AudioVisualizer or Settings panel) doesn't bring down the whole application.

---

## Core Concepts

### Why Error Boundaries Are Needed

Without error boundaries, a JavaScript error in any component's render method causes the **entire React tree to unmount** — the user sees a white screen. Error boundaries catch these errors and display a fallback UI while the rest of the app continues working.

### The Class Component Requirement

Error boundaries **must** be class components because React's error catching relies on two lifecycle methods that aren't available as hooks:

- **`static getDerivedStateFromError(error)`** — Update state to show fallback UI
- **`componentDidCatch(error, errorInfo)`** — Log error details

```typescript
// From electron-app/src/components/ErrorBoundary.tsx
interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state to trigger fallback UI on next render
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={this.handleReset}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### What Error Boundaries Catch

| Caught ✅ | Not Caught ❌ |
|-----------|--------------|
| Errors in render methods | Event handler errors |
| Errors in lifecycle methods | Async errors (promises) |
| Errors in constructors | Errors in the error boundary itself |
| Errors in static methods | Server-side rendering errors |

For event handlers and async errors, use try/catch:

```typescript
const handleSearch = async () => {
  try {
    const results = await provider.searchTracks(query);
    setSearchResults(results);
  } catch (error) {
    // Error boundaries won't catch this — handle it ourselves
    showToast('Search failed', 'error');
  }
};
```

### How DJ.ai Uses ErrorBoundary

The ErrorBoundary wraps the entire component tree at the top level:

```typescript
// In main.tsx or App.tsx
<ErrorBoundary>
  <BrowserRouter>
    <ToastProvider>
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </ToastProvider>
  </BrowserRouter>
</ErrorBoundary>
```

If `AudioVisualizer` throws during its Three.js render, or `Settings` fails to parse saved data, or `OnboardingWizard` encounters a bad state — the ErrorBoundary catches it and shows a recovery UI instead of a white screen.

### Recovery Strategies

DJ.ai's ErrorBoundary includes a **reset button** that clears the error state and re-renders the children:

```typescript
handleReset = () => {
  this.setState({ hasError: false, error: undefined, errorInfo: undefined });
};
```

More advanced recovery could include:
- Clearing corrupted localStorage data
- Resetting to default settings
- Navigating back to the home page
- Reporting the error to a telemetry service

---

## 🔗 DJ.ai Connection

- **`electron-app/src/components/ErrorBoundary.tsx`** — Class component implementing `getDerivedStateFromError` and `componentDidCatch`; wraps the entire app tree
- **`electron-app/src/App.tsx`** — ErrorBoundary is one of the outermost wrappers in the component hierarchy
- **`electron-app/src/components/AudioVisualizer.tsx`** — Complex Three.js/WebGL code that could throw if browser doesn't support WebGL
- **`electron-app/src/components/OAuthCallback.tsx`** — Could fail if OAuth state is corrupted; ErrorBoundary catches the render error

---

## 🎯 Key Takeaways

- Error boundaries are the **only React feature** that still requires a class component
- They catch errors during **rendering** — not in event handlers or async code
- DJ.ai wraps its entire tree in a single ErrorBoundary for maximum coverage
- The fallback UI includes a **reset button** to recover without reloading the app
- Use **try/catch** in event handlers and async functions (error boundaries won't catch those)
- Error boundaries prevent a single component failure from crashing the entire application

---

## 📖 Resources

- [Catching rendering errors with an error boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) — Official React docs
- [Error Boundaries](https://legacy.reactjs.org/docs/error-boundaries.html) — Legacy docs with detailed examples
- [react-error-boundary](https://github.com/bvaughn/react-error-boundary) — Popular library with hooks-based API
