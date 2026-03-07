# React Testing Library

## Overview

[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (RTL) is DJ.ai's library for testing React components. Its core philosophy aligns perfectly with DJ.ai's anti-tautology principle: **test what the user sees and does**, not implementation details.

RTL encourages querying the DOM the way users interact with it — by role, text, and label — not by CSS class names, component internals, or state variables.

## Guiding Principle

> "The more your tests resemble the way your software is used, the more confidence they can give you."
> — Kent C. Dodds

This means:
- ✅ `getByRole('button', { name: 'Connect' })` — user sees a button labeled "Connect"
- ❌ `container.querySelector('.btn-connect')` — user doesn't know CSS classes
- ❌ `wrapper.instance().state.connected` — user doesn't know React state

## Learning Path

| Topic | File | What You'll Learn |
|-------|------|-------------------|
| [Queries](./queries.md) | Finding elements | getByRole, getByText, queryBy vs findBy |
| [User Events](./user-events.md) | Simulating interaction | click, type, keyboard navigation |
| [Render Patterns](./render-patterns.md) | Component setup | render(), cleanup, custom render |

## Quick Example

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from './Settings';

test('user can type API key', async () => {
  render(<Settings providers={mockProviders} />);

  const input = screen.getByLabelText('API Key');
  await userEvent.type(input, 'my-api-key');

  expect(input).toHaveValue('my-api-key');
});
```

## Why RTL Over Enzyme?

| Aspect | React Testing Library | Enzyme |
|--------|----------------------|--------|
| Query strategy | By role, text, label (user perspective) | By component type, props, state |
| Renders | Full DOM rendering | Shallow or full |
| Encourages | Accessible, testable components | Implementation-coupled tests |
| Maintained | Actively maintained | Deprecated for React 18+ |

## Key Takeaways

- Query by role and text, not by CSS class or component internals
- Tests should break when behavior changes, not when implementation changes
- RTL's accessible queries naturally enforce WCAG AA compliance
- Combined with Vitest's jsdom environment, RTL tests run in Node.js with full DOM simulation

## DJ.ai Connection

RTL is used throughout DJ.ai's component tests — Settings, OnboardingWizard, App, and all UI components. Because DJ.ai follows WCAG AA accessibility standards, RTL's role-based queries (`getByRole`, `getByLabelText`) naturally align with the component structure. If a component is hard to test with RTL, it's usually a sign that the component has accessibility issues.

## Further Reading

- [React Testing Library Introduction](https://testing-library.com/docs/react-testing-library/intro/)
- [Which Query Should I Use?](https://testing-library.com/docs/queries/about#priority)
- [Common Mistakes with RTL](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
