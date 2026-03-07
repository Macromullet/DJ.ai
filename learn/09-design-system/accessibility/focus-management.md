# Focus Management

## The Concept

Focus management ensures that **keyboard users** can navigate every interactive element in a logical order with clear visual feedback. When focus is invisible or jumps unpredictably, keyboard-only users are effectively locked out.

Three pillars of focus management:

1. **Focus indicators** — Visual cue showing which element is currently focused
2. **Tab order** — Logical sequence that follows the visual layout
3. **Focus trapping** — Keeping focus inside modals/dialogs until they're dismissed

### `:focus` vs `:focus-visible`

`:focus` applies to all focus events, including mouse clicks — causing annoying outlines when clicking buttons. `:focus-visible` only applies when focus is relevant to the user (keyboard navigation), giving you the best of both worlds:

```css
/* Remove default outline */
:focus { outline: none; }

/* Show outline only for keyboard users */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

## How DJ.ai Handles Focus

### Global Focus Styles (base.css)

```css
/* electron-app/src/styles/base.css */
:focus {
  outline: none;
}

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

Every focusable element in DJ.ai gets a **gold outline** (matching the brand color) when navigated via keyboard. The `outline-offset: 2px` prevents the outline from overlapping the element's content.

### Making Non-Button Elements Focusable

Clickable `<div>` or `<span>` elements must be made keyboard-accessible:

```tsx
<div
  className="track-item"
  tabIndex={0}
  role="button"
  aria-label="Play Never Gonna Give You Up"
  onClick={handlePlay}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlay();
    }
  }}
>
```

### Focus Trapping in Modals

When a modal or dialog opens, focus should be trapped inside until the user explicitly closes it. This prevents keyboard users from tabbing "behind" the modal into invisible content:

```tsx
// Simplified focus trap pattern
useEffect(() => {
  if (isOpen) {
    const firstFocusable = modalRef.current?.querySelector('button, [tabindex="0"]');
    firstFocusable?.focus();
  }
}, [isOpen]);
```

## DJ.ai Connection

DJ.ai's `base.css` applies focus-visible outlines globally, meaning every component inherits keyboard accessibility automatically. Interactive non-button elements (like track list items, provider cards in onboarding) use `tabIndex={0}` with `onKeyDown` handlers for Enter and Space keys. The onboarding wizard manages step focus so keyboard users can navigate through the setup flow sequentially.

## Key Takeaways

- Use `:focus-visible` instead of `:focus` to avoid unwanted outlines on mouse clicks
- Every clickable element needs `tabIndex={0}`, `role`, and `onKeyDown` if it's not a `<button>`
- Trap focus inside modals to prevent keyboard users from getting lost
- Tab order should follow the visual reading order (left-to-right, top-to-bottom)

## Further Reading

- [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
- [W3C APG: Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [Deque: Focus Management](https://www.deque.com/blog/give-site-focus-tips-designing-usable-focus-indicators/)
