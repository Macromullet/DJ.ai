# Reduced Motion

## The Concept

Some users experience **vestibular disorders**, migraines, or seizure conditions that make animations, parallax scrolling, and rapid visual transitions physically uncomfortable or dangerous. The `prefers-reduced-motion` CSS media query lets you detect when a user has requested minimal motion in their OS settings and respond accordingly.

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable or minimize animations */
}
```

This is a **user preference**, not a suggestion. Respecting it is both an accessibility requirement (WCAG 2.3.3) and an ethical responsibility.

### How Users Enable It

- **macOS:** System Preferences → Accessibility → Display → Reduce motion
- **Windows:** Settings → Ease of Access → Display → Show animations = Off
- **iOS:** Settings → Accessibility → Motion → Reduce Motion
- **Android:** Settings → Accessibility → Remove animations

## How DJ.ai Respects Reduced Motion

DJ.ai implements a **global reduced-motion override** in `electron-app/src/styles/base.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### What This Does

- **All animations** complete instantly (0.01ms duration)
- **All transitions** complete instantly (no sliding, fading, or scaling)
- **Scroll behavior** reverts to instant (no smooth scrolling)
- **Animation iterations** limited to 1 (no looping)

### Why `!important` Is Used Here

This is the **only place** in DJ.ai's codebase where `!important` is acceptable. The reduced-motion override must beat every component's animation specificity — it's a safety net for user health, not a styling shortcut.

### What It Affects in DJ.ai

| Feature | Normal | Reduced Motion |
|---------|--------|----------------|
| Toast slide-in | 250ms slide | Instant appear |
| Button hover transitions | 150ms ease | Instant change |
| Gradient text shimmer | Animated gradient | Static gradient |
| Page transitions | Fade in/out | Instant swap |
| Progress bar | Smooth fill | Instant fill |

### JavaScript Consideration

For JavaScript-driven animations (complex sequences, canvas rendering), check the preference programmatically:

```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReducedMotion) {
  // Skip or simplify animation
}
```

## DJ.ai Connection

The reduced-motion query in `base.css` is a safety net applied globally — no component needs to implement its own motion check for CSS animations. For any future JavaScript-driven animations (e.g., a planned GPU visualizer), a separate `matchMedia` check will be needed to suppress canvas/WebGL animations. This aligns with DJ.ai's accessibility-first design philosophy.

## Key Takeaways

- `prefers-reduced-motion` is an OS-level user preference — always respect it
- A global CSS override catches all CSS animations and transitions automatically
- JavaScript animations (Canvas, WebGL) need a separate `matchMedia` check
- This is an accessibility and health concern, not just a preference

## Further Reading

- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [web.dev: prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)
- [A11y Project: Reduced Motion](https://www.a11yproject.com/posts/understanding-vestibular-disorders/)
