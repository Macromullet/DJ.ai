# Spacing Tokens

## The Concept

Consistent spacing is one of the most impactful — and most overlooked — aspects of UI design. A **spacing scale** provides a fixed set of values that all margins, paddings, and gaps pull from. This prevents the "death by a thousand pixels" problem where every component invents its own spacing.

Most spacing scales use a **base unit** multiplied by integers. The most popular base is **4px** because it aligns cleanly to pixel grids, divides evenly at common screen densities, and produces a natural visual rhythm.

```
4px  → tight (icons, inline elements)
8px  → compact (buttons, chips)
16px → standard (cards, sections)
32px → spacious (major sections)
64px → dramatic (page-level breaks)
```

## DJ.ai's Spacing Scale

DJ.ai defines a 4px-based scale in `electron-app/src/styles/tokens.css`:

```css
--space-0: 0px;
--space-1: 4px;      /* Tight: icon gaps, badge padding */
--space-2: 8px;      /* Compact: button padding, chip gaps */
--space-3: 12px;     /* Snug: form field spacing */
--space-4: 16px;     /* Standard: card padding, section gaps */
--space-5: 20px;     /* Comfortable: between related groups */
--space-6: 24px;     /* Relaxed: major section padding */
--space-7: 28px;
--space-8: 32px;     /* Spacious: panel padding */
--space-9: 36px;
--space-10: 40px;    /* Wide: page-level spacing */
--space-12: 48px;
--space-16: 64px;    /* Dramatic: hero sections */
```

### Usage in Components

Spacing tokens appear in padding, margins, and CSS `gap`:

```css
/* Button uses space-2 (8px) vertical, space-4 (16px) horizontal */
.btn {
  padding: var(--space-2) var(--space-4);
  gap: var(--space-2);
}

/* Card uses space-4 (16px) all around */
.card {
  padding: var(--space-4);
}

/* Input with consistent internal padding */
.input {
  padding: var(--space-2) var(--space-3);
}
```

### Layout Tokens

DJ.ai also defines structural spacing for major layout regions:

```css
--header-height: 72px;
--controls-height: 88px;
--sidebar-width: 320px;
--content-max-width: 1400px;
```

## DJ.ai Connection

The spacing scale is used throughout every component — from the `var(--space-2)` gap in button icon groups to the `var(--space-6)` padding in the onboarding wizard panels. The scale skips `--space-11`, `--space-13` through `--space-15` intentionally — not every multiple is needed, and a smaller set of options makes decisions faster.

## Key Takeaways

- A 4px base unit aligns to pixel grids at all common screen densities
- Constraining choices (12 values, not infinite) speeds up development
- Use `gap` for flex/grid layouts instead of margins — it's cleaner and doesn't create unwanted outer spacing
- Structural dimensions (header height, sidebar width) are also tokens

## Further Reading

- [Every Layout: Units](https://every-layout.dev/rudiments/units/)
- [Material Design: Spacing](https://m3.material.io/foundations/layout/understanding-layout/spacing)
- [MDN: CSS gap](https://developer.mozilla.org/en-US/docs/Web/CSS/gap)
