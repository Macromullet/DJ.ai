# 09 — Design System

## Why Design Systems Matter

A **design system** is a collection of reusable decisions — colors, spacing, typography, components — encoded as code. Instead of every developer choosing their own shade of grey or button padding, the system provides a single source of truth that keeps the UI consistent, maintainable, and accessible.

Design systems solve three problems:

1. **Consistency** — Every screen looks like it belongs to the same product
2. **Speed** — Developers grab tokens and utility classes instead of inventing styles
3. **Maintainability** — Change a token once, the entire app updates

## How DJ.ai Implements Its Design System

DJ.ai uses a **three-layer CSS architecture**:

```
tokens.css      → Design tokens (CSS custom properties)
  ↓
base.css        → Reset, global defaults, focus/motion
  ↓
utilities.css   → Reusable component patterns (.btn, .card, .input)
  ↓
*.css           → Component-scoped styles (.wizard-*, .mp-*, .ai-*)
```

The golden rule: **ALL visual values must reference tokens.** Never hardcode a hex color, pixel size, or font weight in a component file. If a value doesn't exist in `tokens.css`, add it there first.

## Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [Tokens](./tokens/) | CSS custom properties as design tokens |
| 2 | [CSS Architecture](./css-architecture/) | How styles are organized and scoped |
| 3 | [Accessibility](./accessibility/) | WCAG AA compliance techniques |

## Key Takeaways

- Design tokens are the atomic building blocks of visual consistency
- CSS custom properties cascade, enabling theming without build tools
- Utility classes reduce duplication; component styles handle unique layouts
- Accessibility is a design system concern, not an afterthought

## Further Reading

- [Design Tokens W3C Community Group](https://www.w3.org/community/design-tokens/)
- [Smashing Magazine: Design Systems](https://www.smashingmagazine.com/design-systems-book/)
- [Brad Frost: Atomic Design](https://atomicdesign.bradfrost.com/)
