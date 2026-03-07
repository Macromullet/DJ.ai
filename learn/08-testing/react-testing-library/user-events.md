# React Testing Library — User Events

## Concept

`@testing-library/user-event` simulates real user interactions — clicking, typing, keyboard navigation — in a way that mirrors how a real browser processes these events. Unlike `fireEvent` (which dispatches a single DOM event), `userEvent` triggers the **full event sequence** that a browser would produce.

For example, `userEvent.click()` fires: pointerdown → mousedown → pointerup → mouseup → click — just like a real user clicking.

## Core Interactions

### Click

```typescript
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Click a button
await user.click(screen.getByRole('button', { name: 'Connect' }));

// Double click
await user.dblClick(screen.getByRole('button', { name: 'Play' }));
```

### Type

```typescript
// Type into an input
const input = screen.getByLabelText('API Key');
await user.type(input, 'my-secret-key');

// Clear and retype
await user.clear(input);
await user.type(input, 'new-key');
```

### Select Options

```typescript
const select = screen.getByRole('combobox', { name: 'Provider' });
await user.selectOptions(select, 'spotify');
```

### Keyboard Navigation

```typescript
// Tab to next element
await user.tab();

// Press Enter on focused element
await user.keyboard('{Enter}');

// Press Space (toggle checkbox, activate button)
await user.keyboard(' ');

// Arrow keys
await user.keyboard('{ArrowDown}');
```

### Keyboard Shortcuts

```typescript
// Ctrl+A (select all)
await user.keyboard('{Control>}a{/Control}');

// Shift+Tab (reverse tab)
await user.keyboard('{Shift>}{Tab}{/Shift}');
```

## How DJ.ai Uses User Events

### Settings Tests — API Key Input

```typescript
test('user can enter and save API key', async () => {
  const user = userEvent.setup();
  render(<Settings providers={mockProviders} onSave={mockSave} />);

  const apiKeyInput = screen.getByLabelText(/api key/i);
  await user.type(apiKeyInput, 'AIzaSy-test-key-123');

  const saveButton = screen.getByRole('button', { name: /save/i });
  await user.click(saveButton);

  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({ apiKey: 'AIzaSy-test-key-123' })
  );
});
```

### Toggle Provider Tests

```typescript
test('user can toggle provider selection', async () => {
  const user = userEvent.setup();
  render(<Settings providers={mockProviders} />);

  const spotifyToggle = screen.getByRole('switch', { name: /spotify/i });
  await user.click(spotifyToggle);

  expect(spotifyToggle).toBeChecked();
});
```

### Keyboard Accessibility Tests

```typescript
test('buttons are keyboard accessible', async () => {
  const user = userEvent.setup();
  render(<OnboardingWizard onComplete={mockComplete} />);

  // Tab to the "Next" button
  await user.tab();
  await user.tab();

  const nextButton = screen.getByRole('button', { name: /next/i });
  expect(nextButton).toHaveFocus();

  // Activate with Enter
  await user.keyboard('{Enter}');
  expect(screen.getByText('Step 2')).toBeInTheDocument();
});
```

## userEvent.setup() vs Direct Calls

```typescript
// ✅ Recommended — creates a user instance with shared state
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');

// ⚠️ Legacy — each call is independent (loses keyboard state)
await userEvent.click(button);
await userEvent.type(input, 'text');
```

`userEvent.setup()` maintains state between interactions (keyboard modifiers, pointer position), making multi-step interactions more realistic.

## fireEvent vs userEvent

| Aspect | fireEvent | userEvent |
|--------|-----------|-----------|
| Events fired | Single event | Full event sequence |
| Realism | Low (manual dispatch) | High (browser-like) |
| Focus handling | Manual | Automatic |
| Use when | Testing specific event handlers | Testing user interactions |

## Key Takeaways

- Always use `userEvent.setup()` for realistic, stateful interactions
- `userEvent` triggers full event sequences, catching bugs that `fireEvent` misses
- Test keyboard accessibility (Tab, Enter, Space) alongside click interactions
- Use `user.type()` for text input, `user.click()` for buttons and toggles

## DJ.ai Connection

User event testing is critical for DJ.ai's accessibility compliance (WCAG AA). The Settings and OnboardingWizard components are tested for both mouse and keyboard interactions, ensuring that all features are accessible without a mouse. The `userEvent.setup()` pattern is standard across all DJ.ai component tests.

## Further Reading

- [User Event Introduction](https://testing-library.com/docs/user-event/intro)
- [User Event API Reference](https://testing-library.com/docs/user-event/convenience)
- [Keyboard Interaction](https://testing-library.com/docs/user-event/keyboard)
