# ARIA (Accessible Rich Internet Applications)

## The Concept

ARIA provides **attributes** that make dynamic web content accessible to assistive technologies like screen readers. When HTML semantics aren't enough — custom sliders, live-updating regions, complex widgets — ARIA fills the gap.

Three categories of ARIA attributes:

1. **Roles** — What the element *is* (`role="slider"`, `role="button"`, `role="alert"`)
2. **Properties** — Static characteristics (`aria-label`, `aria-describedby`, `aria-required`)
3. **States** — Dynamic values that change (`aria-expanded`, `aria-checked`, `aria-valuenow`)

### The First Rule of ARIA

> "If you can use a native HTML element with the semantics and behavior you need, use that instead of adding ARIA."

A `<button>` already has `role="button"`, keyboard handling, and focus management built in. ARIA is for when native elements can't express your UI's semantics.

## How DJ.ai Uses ARIA

### Labeling Icon Buttons

Buttons with only icons need `aria-label` so screen readers announce their purpose:

```tsx
<button
  className="mp-controls-btn"
  aria-label="Play"
  onClick={handlePlay}
>
  ▶️
</button>
```

### Live Regions for Dynamic Content

When content updates without a page reload (track changes, AI commentary), `aria-live` tells screen readers to announce the change:

```tsx
<div
  className="ai-commentary-text"
  aria-live="polite"
  aria-atomic="true"
>
  {commentary}
</div>
```

- `aria-live="polite"` — Announces when the screen reader is idle (doesn't interrupt)
- `aria-live="assertive"` — Interrupts immediately (use sparingly, for errors)
- `aria-atomic="true"` — Reads the entire region, not just the changed part

### Custom Sliders

Native `<input type="range">` has accessibility built in, but custom slider implementations need manual ARIA:

```tsx
<div
  role="slider"
  aria-label="Volume"
  aria-valuenow={volume}
  aria-valuemin={0}
  aria-valuemax={100}
  tabIndex={0}
  onKeyDown={handleSliderKeys}
>
```

### Describing Complex Actions

`aria-describedby` provides additional context beyond the label:

```tsx
<button aria-label="Disconnect" aria-describedby="disconnect-help">
  Disconnect
</button>
<span id="disconnect-help" className="sr-only">
  Removes your Spotify connection. You can reconnect anytime.
</span>
```

## DJ.ai Connection

DJ.ai uses ARIA throughout its interactive components: icon-only playback buttons get `aria-label`, the AI commentary panel uses `aria-live="polite"` to announce generated text, and the progress/volume sliders use `role="slider"` with value attributes. The `.sr-only` utility class in `utilities.css` is used alongside ARIA to provide hidden descriptive text.

## Key Takeaways

- Use native HTML elements first; add ARIA only when semantics are insufficient
- Every icon button needs `aria-label` — screen readers can't read emoji or SVG
- `aria-live="polite"` is essential for dynamic content (track changes, AI commentary)
- Custom interactive widgets need `role`, `aria-value*`, and keyboard handlers

## Further Reading

- [MDN: ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [A11y Project: ARIA](https://www.a11yproject.com/posts/an-indepth-guide-to-aria-roles/)
