# React Hooks

> The foundation of DJ.ai's React code — every component uses hooks for state, effects, and refs.

React Hooks let you use state, side effects, refs, and other React features in functional components. Before hooks (React 16.8), you needed class components for stateful logic. DJ.ai uses hooks exclusively — the codebase has zero class components except for `ErrorBoundary` (which React requires to be a class).

---

## Why Hooks Matter

1. **State without classes** — `useState` and `useReducer` manage component state
2. **Side effects** — `useEffect` handles API calls, subscriptions, and cleanup
3. **Refs** — `useRef` provides mutable values that persist across renders without causing re-renders
4. **Memoization** — `useCallback` and `useMemo` prevent unnecessary recalculations
5. **Composition** — custom hooks extract reusable stateful logic

---

## 🗺️ Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [useState & useReducer](./useState-and-useReducer.md) | Managing component state |
| 2 | [useEffect](./useEffect.md) | Side effects, cleanup, dependency arrays |
| 3 | [useRef](./useRef.md) | Mutable refs, DOM refs, stale closure prevention |
| 4 | [useCallback & useMemo](./useCallback-and-useMemo.md) | Memoization and performance |
| 5 | [Custom Hooks](./custom-hooks.md) | Extracting reusable logic |

---

## Rules of Hooks

React enforces two rules (checked by ESLint):

1. **Only call hooks at the top level** — not inside loops, conditions, or nested functions
2. **Only call hooks from React functions** — components or custom hooks

```typescript
// ✅ Correct — top level of component
function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
}

// ❌ Wrong — conditional hook call
function App() {
  if (someCondition) {
    const [state, setState] = useState(false); // BREAKS RULES!
  }
}
```

---

## 🔗 DJ.ai Connection

`App.tsx` alone uses **9+ useRef calls**, **15+ useState calls**, **10+ useEffect calls**, and **5+ useCallback calls**. Every component in the app leverages hooks as its primary programming model.

---

## 📖 Resources

- [Built-in React Hooks](https://react.dev/reference/react/hooks) — Complete hooks reference
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) — Enforcement rules
- [Introducing Hooks](https://react.dev/blog/2023/03/16/introducing-react-dev) — Why hooks were created
