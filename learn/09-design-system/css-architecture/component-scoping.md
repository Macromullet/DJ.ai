# Component-Scoped CSS

## The Concept

As an application grows, CSS class names from different components inevitably collide. Two developers both write `.title` or `.container`, and styles bleed across boundaries. **Component scoping** solves this by giving every component a unique namespace prefix.

Popular approaches include:
- **BEM** (Block__Element--Modifier) — `.card__title--highlighted`
- **CSS Modules** — Tooling generates unique class names at build time
- **Scoped styles** — Framework-enforced isolation (Vue, Svelte)
- **Prefix conventions** — Manual namespacing by component

## DJ.ai's Naming Convention

DJ.ai uses a **BEM-like prefix convention** where every component's CSS classes start with an abbreviated component name:

```css
/* OnboardingWizard → .wizard-* */
.wizard-container { }
.wizard-step { }
.wizard-step-active { }
.wizard-nav { }

/* MusicPlayer → .mp-* */
.mp-container { }
.mp-track-info { }
.mp-controls { }
.mp-progress-bar { }

/* AI Commentary → .ai-* */
.ai-panel { }
.ai-commentary-text { }
.ai-loading { }

/* Toast notifications → .toast-* */
.toast-container { }
.toast-message { }
.toast-dismiss { }
```

### Why This Works

1. **Collision-free** — `.wizard-step` can never conflict with `.mp-step`
2. **Grep-friendly** — Search `.wizard-` to find all wizard styles instantly
3. **Self-documenting** — The prefix tells you which component owns the style
4. **No tooling required** — Works in plain CSS, no build step needed

### File Organization

Each component has a co-located CSS file:

```
electron-app/src/components/
├── OnboardingWizard.tsx        → OnboardingWizard.css (.wizard-*)
├── MusicPlayer.tsx             → MusicPlayer.css (.mp-*)
├── AICommentary.tsx            → AICommentary.css (.ai-*)
├── Settings.tsx                → Settings.css (.settings-*)
└── Toast.tsx                   → Toast.css (.toast-*)
```

### Rules

1. **Component styles only use their prefix** — `.wizard-*` never references `.mp-*` directly
2. **Shared patterns go in `utilities.css`** — If two components need the same style, it becomes a utility
3. **Never nest deeper than two levels** — `.wizard-step-icon` is fine; `.wizard-step-icon-svg-path` is not

## DJ.ai Connection

This convention is enforced by team practice rather than tooling. Every new component file starts by choosing a short prefix (`2-5 characters`) and using it consistently for all classes. The pattern keeps DJ.ai's stylesheet maintainable even as new providers (Spotify, Apple Music) add their own component styles.

## Key Takeaways

- Prefix all component classes with a short, unique abbreviation
- Co-locate CSS files next to their component files
- Extract shared patterns to `utilities.css` rather than cross-referencing component styles
- Keep nesting shallow — two levels maximum

## Further Reading

- [BEM Introduction](https://getbem.com/introduction/)
- [MindBEMding — Getting Your Head Round BEM](https://csswizardry.com/2013/01/mindbemding-getting-your-head-round-bem-syntax/)
- [CSS Guidelines: Naming Conventions](https://cssguidelin.es/#naming-conventions)
