# Typography Tokens

## The Concept

Typography tokens define the **type scale** — a set of font sizes, line heights, and weights that create visual hierarchy. A well-designed type scale uses ratios (like 1.2× or 1.25×) to produce sizes that feel naturally related, guiding the reader's eye from headings to body text to captions.

Key typography properties:

- **Font size** — The relative importance of text
- **Line height** (leading) — Vertical rhythm and readability
- **Font weight** — Emphasis within a size level
- **Font family** — The typeface character and fallback stack

## DJ.ai's Type System

All typography tokens live in `electron-app/src/styles/tokens.css`:

### Font Scale

```css
--text-xs: 0.6875rem;    /* 11px — Captions, badges, timestamps */
--text-sm: 0.8125rem;    /* 13px — Labels, secondary text, metadata */
--text-base: 0.9375rem;  /* 15px — Body text, default reading size */
--text-lg: 1.125rem;     /* 18px — Subheadings, emphasized content */
--text-xl: 1.5rem;       /* 24px — Section titles */
--text-2xl: 2rem;        /* 32px — Page-level titles, hero text */
```

The scale uses `rem` units for accessibility — if a user changes their browser's base font size, the entire scale adjusts proportionally.

### Line Heights

```css
--leading-tight: 1.2;     /* Headings, single-line labels */
--leading-normal: 1.5;    /* Body text (WCAG recommended minimum) */
--leading-relaxed: 1.65;  /* Long-form content, help text */
```

WCAG 2.1 recommends a minimum 1.5 line height for body text to ensure readability for users with dyslexia or low vision.

### Font Weights

```css
--weight-normal: 400;     /* Body text, descriptions */
--weight-medium: 500;     /* Subtly emphasized text */
--weight-semibold: 600;   /* Buttons, labels, navigation */
--weight-bold: 700;       /* Headings, strong emphasis */
```

### Font Families

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
--font-mono: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
```

The sans stack uses **system fonts first** for instant rendering — no font downloads needed. The mono stack is used for API keys, code snippets, and debug information.

### Applied in base.css

```css
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);      /* 15px default */
  font-weight: var(--weight-normal);
  line-height: var(--leading-normal); /* 1.5 */
}
```

## DJ.ai Connection

The type scale creates a clear visual hierarchy: `--text-2xl` for the "DJ.ai" title, `--text-xl` for section headers in Settings and Onboarding, `--text-base` for all body content, and `--text-xs` for timestamps and badge counts. The `.gradient-text` utility class in `utilities.css` applies the brand gradient to headings for visual flair.

## Key Takeaways

- Use `rem` for font sizes to respect user accessibility preferences
- A 1.5 line height for body text is both a WCAG guideline and a readability best practice
- System font stacks eliminate font-loading delays
- Four weight levels (400–700) provide enough hierarchy without visual clutter

## Further Reading

- [MDN: font-size](https://developer.mozilla.org/en-US/docs/Web/CSS/font-size)
- [Type Scale Calculator](https://type-scale.com/)
- [Modern Font Stacks](https://modernfontstacks.com/)
- [WCAG: Text Spacing](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html)
