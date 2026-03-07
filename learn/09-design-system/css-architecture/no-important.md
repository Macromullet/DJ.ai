# No `!important` Rule

## The Concept

CSS specificity determines which rule wins when multiple selectors target the same element. The `!important` declaration overrides all specificity — and that's exactly the problem. Once you use `!important` to "fix" a style, the only way to override *that* is another `!important`, escalating into an arms race that makes stylesheets unmaintainable.

### The Specificity Hierarchy

```
Inline styles     → 1,0,0,0
#id selectors     → 0,1,0,0
.class selectors  → 0,0,1,0
element selectors → 0,0,0,1

!important        → Overrides everything (nuclear option)
```

Two rules targeting the same element? The one with higher specificity wins. Equal specificity? The one that appears later in the source wins. This system is **predictable** — until `!important` breaks it.

### Why `!important` Is Harmful

1. **Unpredictable cascade** — You can no longer reason about which rule applies
2. **Escalation** — Future developers add more `!important` to override yours
3. **Maintenance nightmare** — Refactoring becomes impossible without breaking things
4. **Breaks user styles** — Assistive technology custom stylesheets can't override `!important`

## DJ.ai's Strict Policy

DJ.ai has **one absolute rule** about `!important`: **don't use it.** If a style isn't applying correctly, the solution is to fix the specificity, not to reach for `!important`.

### Common Fixes Instead of `!important`

**Problem:** A utility class doesn't override a component style.

```css
/* ❌ Don't do this */
.btn-primary {
  color: white !important;
}

/* ✅ Increase specificity naturally */
.btn.btn-primary {
  color: var(--color-text-inverse);
}
```

**Problem:** A parent style leaks into a child component.

```css
/* ❌ Don't do this */
.mp-controls .btn {
  margin: 0 !important;
}

/* ✅ Use the component prefix */
.mp-controls-btn {
  margin: 0;
}
```

**Problem:** Source order causes the wrong rule to win.

```css
/* ✅ Move the rule to appear later, or increase specificity by one class */
```

### The One Exception

DJ.ai's `base.css` uses `!important` in exactly one place — the reduced-motion media query — because it must override **all** animations regardless of specificity:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

This is an accessibility safety net, not a styling pattern. It's the exception that proves the rule.

## DJ.ai Connection

The no-`!important` policy works because DJ.ai's layered CSS architecture (tokens → base → utilities → components) creates naturally increasing specificity. Each layer is more specific than the last, so conflicts resolve predictably without escape hatches.

## Key Takeaways

- `!important` is a symptom of broken architecture, not a solution
- Fix specificity by adding a class, adjusting source order, or restructuring selectors
- The only acceptable `!important` is for accessibility overrides (like reduced motion)
- Well-layered CSS architecture makes `!important` unnecessary

## Further Reading

- [MDN: Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity)
- [CSS Tricks: Specifics on CSS Specificity](https://css-tricks.com/specifics-on-css-specificity/)
- [Harry Roberts: !important](https://csswizardry.com/2016/05/the-importance-of-important/)
