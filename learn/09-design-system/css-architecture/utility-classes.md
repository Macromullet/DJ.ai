# Utility Classes

## The Concept

Utility classes are **small, single-purpose CSS classes** that each do one thing. Instead of writing a new class for every component variation, you compose utilities together. This approach — popularized by frameworks like Tailwind CSS and methodologies like CUBE CSS — favors **composition over inheritance**.

```html
<!-- Instead of a monolithic class -->
<div class="featured-product-card-highlighted">

<!-- Compose utilities with a component class -->
<div class="card gradient-text truncate">
```

The key insight: most CSS rules are **reused patterns** (button styles, card layouts, input resets). Extract them once, use them everywhere.

## DJ.ai's Utility Layer

DJ.ai defines shared utilities in `electron-app/src/styles/utilities.css`, imported after `base.css`:

### Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Hides content visually while keeping it accessible to screen readers — essential for `aria-label` alternatives.

### Text Utilities

```css
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Button System

```css
.btn { /* Base: flexbox, padding, radius, transition */ }
.btn-primary { /* Gold gradient background, inverse text */ }
.btn-secondary { /* Transparent with border */ }
.btn-ghost { /* Minimal — text only, hover reveals background */ }
.btn-danger { /* Error red for destructive actions */ }
```

All buttons use spacing tokens (`--space-2`, `--space-4`) and reference the design token transitions.

### Other Utilities

- `.card` — Raised surface with border, radius, and padding
- `.input` — Consistent form input styling
- `.chip` — Small label/tag element
- `.toast-*` — Toast notification positioning and animations

## DJ.ai Connection

The utility layer in `utilities.css` is the bridge between raw tokens and component styles. Components like the Settings panel use `.btn-primary` and `.card` directly, while the onboarding wizard's step navigation uses `.btn-ghost`. The `.sr-only` class appears wherever visual icons need accessible text alternatives.

## Key Takeaways

- Utility classes eliminate duplicate CSS by extracting common patterns
- Composition (combining small classes) is more maintainable than deep inheritance
- All utilities reference design tokens — never hardcoded values
- `.sr-only` is an accessibility essential, not just a nice-to-have

## Further Reading

- [CUBE CSS Methodology](https://cube.fyi/)
- [Every Layout: Composition](https://every-layout.dev/)
- [Tailwind CSS: Utility-First Fundamentals](https://tailwindcss.com/docs/utility-first)
- [MDN: text-overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/text-overflow)
