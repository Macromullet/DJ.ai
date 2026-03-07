# Accessibility (a11y)

## The Concept

Accessibility ensures that **everyone** can use your application — including people using screen readers, keyboard navigation, voice control, or who have visual, motor, or cognitive differences. It's not a feature you bolt on; it's a quality of how the software is built.

The Web Content Accessibility Guidelines (WCAG) define four principles — known as **POUR**:

1. **Perceivable** — Content can be presented in ways all users can perceive (alt text, color contrast, captions)
2. **Operable** — UI is navigable via keyboard, voice, and assistive tech (focus management, skip links)
3. **Understandable** — Content and UI behavior are predictable (clear labels, error messages)
4. **Robust** — Content works with current and future assistive technologies (semantic HTML, ARIA)

## DJ.ai's Accessibility Baseline

DJ.ai targets **WCAG 2.1 Level AA** compliance. This means:

- All interactive elements are keyboard accessible
- Focus indicators are always visible (`:focus-visible`)
- Color is never the only way to convey information
- Dynamic content updates are announced to screen readers
- Animations respect the user's reduced-motion preference

### Implementation Across the CSS Layers

| Layer | A11y Feature | Source File |
|-------|-------------|-------------|
| `base.css` | `:focus-visible` outlines, reduced-motion | `electron-app/src/styles/base.css` |
| `utilities.css` | `.sr-only` screen-reader-only class | `electron-app/src/styles/utilities.css` |
| `tokens.css` | Sufficient color contrast ratios | `electron-app/src/styles/tokens.css` |
| Components | `aria-label`, `aria-live`, `role` attributes | Individual `.tsx` files |

## Learning Path

| File | Topic |
|------|-------|
| [wcag-aa.md](./wcag-aa.md) | WCAG 2.1 AA requirements |
| [focus-management.md](./focus-management.md) | Keyboard navigation and focus |
| [aria.md](./aria.md) | ARIA roles, labels, live regions |
| [reduced-motion.md](./reduced-motion.md) | Respecting motion preferences |

## Key Takeaways

- Accessibility is a design system concern — bake it into tokens, base styles, and utilities
- WCAG AA is a minimum bar, not a ceiling
- Automated tools catch ~30% of issues; manual keyboard testing catches the rest
- Every interactive element must work with keyboard alone

## Further Reading

- [W3C: Web Accessibility Initiative](https://www.w3.org/WAI/)
- [WebAIM: Introduction to Accessibility](https://webaim.org/intro/)
- [Deque: Accessibility Fundamentals](https://www.deque.com/web-accessibility-beginners-guide/)
