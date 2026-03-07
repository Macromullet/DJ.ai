# CSS Architecture

## The Concept

CSS architecture is how you **organize, name, and layer** your stylesheets so they remain maintainable as a project grows. Without a deliberate architecture, CSS devolves into a tangled mess of overrides, `!important` hacks, and fragile selectors.

Good CSS architecture answers three questions:

1. **Where does this style live?** — Clear file organization
2. **What does this class name mean?** — Predictable naming conventions
3. **Which rule wins?** — Controlled specificity, no surprises

## DJ.ai's Approach

DJ.ai uses a **layered architecture** inspired by [ITCSS](https://www.xfive.co/blog/itcss-scalable-maintainable-css-architecture/) and [CUBE CSS](https://cube.fyi/):

```
tokens.css          → Design tokens (CSS custom properties)
    ↓
base.css            → Reset + global defaults + focus/motion
    ↓
utilities.css       → Reusable classes (.btn, .card, .input, .chip)
    ↓
ComponentName.css   → Component-scoped styles (.wizard-*, .mp-*)
```

Each layer has **increasing specificity** — tokens define raw values, base applies global defaults, utilities provide reusable patterns, and component styles handle specific layouts. This natural ordering means you rarely fight cascade issues.

### Key Source Files

| File | Path | Purpose |
|------|------|---------|
| `tokens.css` | `electron-app/src/styles/tokens.css` | All design tokens |
| `base.css` | `electron-app/src/styles/base.css` | Reset, focus, reduced motion |
| `utilities.css` | `electron-app/src/styles/utilities.css` | Shared UI patterns |
| Component CSS | `electron-app/src/components/*.css` | Per-component styles |

## Learning Path

| File | Topic |
|------|-------|
| [custom-properties.md](./custom-properties.md) | CSS variables vs preprocessors |
| [utility-classes.md](./utility-classes.md) | Reusable style composition |
| [component-scoping.md](./component-scoping.md) | BEM-like naming and isolation |
| [no-important.md](./no-important.md) | Why `!important` is banned |

## Key Takeaways

- Layer styles from general (tokens) to specific (components)
- Each layer adds specificity naturally — no need for `!important`
- Predictable naming conventions prevent class collisions
- A well-structured CSS architecture scales with the team and codebase

## Further Reading

- [CUBE CSS Methodology](https://cube.fyi/)
- [ITCSS Architecture](https://www.xfive.co/blog/itcss-scalable-maintainable-css-architecture/)
- [Harry Roberts: Managing CSS Projects](https://csswizardry.com/2014/10/the-specificity-graph/)
