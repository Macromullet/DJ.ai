# Design Tokens

## What Are Design Tokens?

Design tokens are the **smallest repeatable design decisions** — colors, spacing, fonts, shadows — stored as named values. In DJ.ai, tokens are implemented as **CSS Custom Properties** (also called CSS variables), making them the single source of truth for all visual styling.

```css
/* A design token in tokens.css */
--color-primary: #F5C518;

/* Used everywhere via var() */
background: var(--color-primary);
```

Unlike preprocessor variables (Sass `$variables`), CSS custom properties are **live at runtime**. They cascade through the DOM, can be overridden in media queries, and are inspectable in browser DevTools.

## How DJ.ai Organizes Tokens

All tokens live in `electron-app/src/styles/tokens.css` under the `:root` selector:

| Category | Examples | Purpose |
|----------|----------|---------|
| **Brand Colors** | `--color-primary`, `--gradient-primary` | DJ.ai gold identity |
| **Surface Colors** | `--color-bg-base`, `--color-bg-card` | Dark theme backgrounds |
| **Semantic Colors** | `--color-success`, `--color-error` | Status communication |
| **Spacing** | `--space-1` through `--space-16` | 4px-based scale |
| **Typography** | `--text-xs` through `--text-2xl` | Font size scale |
| **Radius** | `--radius-sm` through `--radius-full` | Corner rounding |
| **Shadows** | `--shadow-sm`, `--shadow-glow` | Depth and emphasis |
| **Transitions** | `--transition-fast`, `--ease-standard` | Motion timing |
| **Z-Index** | `--z-modal`, `--z-toast` | Stacking order |

## Why Not Sass/Less Variables?

CSS custom properties have advantages that preprocessor variables lack:

1. **Runtime resolution** — Change a property in DevTools and see it instantly
2. **Cascading** — Override tokens for specific component subtrees
3. **Media queries** — Adjust tokens responsively without duplicating rules
4. **No build step** — Work in any CSS file, no compilation needed

## Learning Path

| File | Topic |
|------|-------|
| [colors.md](./colors.md) | Color palette, dark mode, semantic colors |
| [spacing.md](./spacing.md) | 4px base scale, consistent spacing |
| [typography.md](./typography.md) | Font scale, weights, line heights |

## Key Takeaways

- Design tokens encode decisions, not just values
- CSS custom properties provide runtime flexibility that preprocessors can't match
- Centralizing tokens in one file prevents drift and makes refactoring trivial

## Further Reading

- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [CSS Tricks: A Complete Guide to Custom Properties](https://css-tricks.com/a-complete-guide-to-custom-properties/)
