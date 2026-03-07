# CSS Custom Properties

## The Concept

CSS Custom Properties (often called "CSS variables") are named values declared with `--` that can be referenced anywhere via `var()`. Unlike Sass or Less variables, which are compiled away at build time, custom properties exist **at runtime in the browser** and participate in the CSS cascade.

```css
/* Declaration */
:root {
  --color-primary: #F5C518;
}

/* Usage with fallback */
color: var(--color-primary, gold);
```

### Custom Properties vs Preprocessor Variables

| Feature | CSS Custom Properties | Sass `$variables` |
|---------|----------------------|-------------------|
| Runtime | ✅ Live in browser | ❌ Compiled away |
| Cascade | ✅ Inherit through DOM | ❌ Flat scope |
| Media queries | ✅ Can change per breakpoint | ❌ Static at build |
| DevTools | ✅ Inspectable, editable | ❌ Not visible |
| JavaScript | ✅ `getComputedStyle()` | ❌ Not accessible |
| Theming | ✅ Override per subtree | ❌ Requires rebuild |

## How DJ.ai Uses Custom Properties

DJ.ai's iron rule: **ALL visual values must reference CSS custom properties from `tokens.css`.** No hardcoded hex colors, pixel sizes, or font values in component files.

### Cascading for Context

Because custom properties cascade, you could override tokens for a specific subtree:

```css
/* If a light-theme section were needed */
.light-panel {
  --color-bg-base: #FFFFFF;
  --color-text-primary: #1A1A1A;
}
/* All children automatically adapt */
```

### Fallback Values

The `var()` function accepts a fallback that applies if the property is undefined:

```css
/* Safe reference with fallback */
border-color: var(--color-border-default, rgba(255, 255, 255, 0.1));
```

### Computed Values

Custom properties can reference other custom properties:

```css
--color-text-accent: var(--color-primary);
--transition-fast: var(--duration-fast) var(--ease-standard);
```

### JavaScript Access

```typescript
// Read a token value at runtime
const primary = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary');

// Dynamically set a token
document.documentElement.style.setProperty('--color-primary', '#FF0000');
```

## DJ.ai Connection

In `electron-app/src/styles/tokens.css`, every visual decision is encoded as a custom property under `:root`. Component CSS files (`OnboardingWizard.css`, `MusicPlayer.css`, etc.) consume these tokens exclusively. This makes global changes — like adjusting the primary gold or switching surface darkness — a single-line edit with app-wide effect.

## Key Takeaways

- CSS custom properties are live, cascading, and inspectable — preprocessor variables aren't
- Always provide a fallback value for defensive coding
- Centralizing all tokens in `:root` creates a single source of truth
- Custom properties enable theming without build tools or JavaScript

## Further Reading

- [MDN: Using CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [CSS Tricks: Complete Guide to Custom Properties](https://css-tricks.com/a-complete-guide-to-custom-properties/)
- [Lea Verou: CSS Variables](https://lea.verou.me/blog/2021/10/custom-properties-with-defaults/)
