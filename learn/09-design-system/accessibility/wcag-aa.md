# WCAG 2.1 Level AA

## The Concept

The **Web Content Accessibility Guidelines** (WCAG) 2.1 are the international standard for web accessibility. Level AA is the most commonly targeted conformance level — it covers the needs of most users without imposing extreme constraints on design.

WCAG organizes requirements into **four principles** (POUR), each containing specific **success criteria**:

### Perceivable

- **1.4.3 Contrast (Minimum)** — Text must have a contrast ratio of at least 4.5:1 against its background (3:1 for large text)
- **1.4.11 Non-text Contrast** — UI components and graphics need 3:1 contrast
- **1.3.1 Info and Relationships** — Structure conveyed visually must also be conveyed programmatically (headings, lists, form labels)

### Operable

- **2.1.1 Keyboard** — All functionality accessible via keyboard
- **2.4.7 Focus Visible** — Keyboard focus indicator is always visible
- **2.4.3 Focus Order** — Tab order follows a logical reading sequence

### Understandable

- **3.3.1 Error Identification** — Errors are described in text, not just color
- **3.3.2 Labels or Instructions** — Form inputs have visible labels

### Robust

- **4.1.2 Name, Role, Value** — All UI components expose their name, role, and state to assistive technology

## How DJ.ai Meets WCAG AA

| Criteria | DJ.ai Implementation |
|----------|---------------------|
| Color contrast | Gold `#F5C518` on `#0D0D0D` = 11.3:1 ratio ✅ |
| Focus visible | `base.css` defines `:focus-visible` with 2px gold outline |
| Keyboard access | All buttons, inputs, and controls are tabbable |
| Semantic colors | `--color-error`, `--color-success` paired with text labels |
| Screen reader text | `.sr-only` hides visual-only icons from sighted users |
| Dynamic content | `aria-live="polite"` announces track changes, commentary |

### Contrast Ratios in DJ.ai

```
Primary text (#F0F0F0) on base (#0D0D0D) = 18.1:1  ✅
Secondary text (#A0A0A0) on base (#0D0D0D) = 9.0:1  ✅
Gold (#F5C518) on base (#0D0D0D) = 11.3:1           ✅
Gold (#F5C518) on card (#1E1E1E) = 9.0:1             ✅
```

## DJ.ai Connection

WCAG AA is the baseline target for all DJ.ai UI components. Every new component goes through a mental checklist: Can I tab to it? Does it have a visible focus indicator? Does color alone convey meaning? Is dynamic content announced? The design token system supports this by ensuring all color pairings have sufficient contrast built in.

## Key Takeaways

- WCAG AA requires 4.5:1 contrast for normal text, 3:1 for large text and UI components
- Every interactive element must be keyboard-operable with visible focus
- Color must never be the sole indicator of state (always pair with text or icons)
- Test with both automated tools (axe, Lighthouse) and manual keyboard navigation

## Further Reading

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WCAG 2.1 Specification](https://www.w3.org/TR/WCAG21/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
