# Color Tokens

## The Concept

Color tokens define a **semantic palette** — named colors organized by purpose rather than appearance. Instead of scattering `#F5C518` across fifty files, you reference `--color-primary` and the system stays consistent. Changing the brand color means editing one line.

Modern design systems separate colors into three layers:

1. **Primitive** — Raw hex values (`#F5C518`)
2. **Semantic** — Purpose-based names (`--color-primary`, `--color-error`)
3. **Component** — Context-specific (`--color-bg-card`, `--color-text-secondary`)

## DJ.ai's Color Architecture

DJ.ai uses a **dark-first** palette defined in `electron-app/src/styles/tokens.css`:

### Brand Colors

```css
--color-primary: #F5C518;              /* DJ.ai signature gold */
--color-primary-hover: #FFD740;         /* Lighter gold on hover */
--color-primary-muted: rgba(245, 197, 24, 0.15);  /* Subtle gold tint */
--color-primary-glow: rgba(245, 197, 24, 0.35);   /* Glow effect */
--gradient-primary: linear-gradient(135deg, #F5C518 0%, #FF9F1C 100%);
```

### Dark Surfaces (7 levels of elevation)

```css
--color-bg-base: #0D0D0D;     /* Deepest background */
--color-bg-raised: #141414;    /* Slightly elevated */
--color-bg-overlay: #1A1A1A;   /* Overlays, sidebars */
--color-bg-card: #1E1E1E;      /* Card surfaces */
--color-bg-input: #252525;     /* Form inputs */
--color-bg-hover: #2A2A2A;     /* Hover state */
--color-bg-active: #333333;    /* Active/pressed */
```

This progressive lightening creates subtle depth without borders — a technique common in dark UI design.

### Semantic Colors

```css
--color-success: #34D399;      /* Connected, saved, complete */
--color-warning: #FBBF24;      /* Attention needed */
--color-error: #F87171;        /* Failure, disconnection */
--color-info: #60A5FA;         /* Informational hints */
```

Each semantic color has a `*-muted` variant at 15% opacity for backgrounds:

```css
--color-error-muted: rgba(248, 113, 113, 0.15);
/* Used for error banner backgrounds without overwhelming the UI */
```

### Text Colors (4 hierarchy levels)

```css
--color-text-primary: #F0F0F0;    /* Main content */
--color-text-secondary: #A0A0A0;  /* Supporting text */
--color-text-tertiary: #707070;   /* De-emphasized */
--color-text-disabled: #4A4A4A;   /* Inactive states */
```

## DJ.ai Connection

Every component references these tokens — never raw hex values. The `.gradient-text` utility in `utilities.css` applies the brand gradient to headings. The gold `#F5C518` primary carries through buttons (`.btn-primary`), links (`base.css`), and focus outlines (`:focus-visible`).

## Key Takeaways

- Name colors by purpose (`--color-error`), not appearance (`--color-red`)
- Dark themes use progressive surface lightening for depth
- Muted variants (15% opacity) provide subtle backgrounds for status indicators
- A consistent text hierarchy (primary → secondary → tertiary → disabled) guides readability

## Further Reading

- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [W3C: CSS Color Level 4](https://www.w3.org/TR/css-color-4/)
- [Material Design: Dark Theme](https://m3.material.io/styles/color/dynamic/choosing-a-scheme)
