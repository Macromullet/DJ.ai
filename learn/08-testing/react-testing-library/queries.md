# React Testing Library — Queries

## Concept

Queries are the primary way to find elements in the rendered DOM. React Testing Library provides queries ordered by **priority** — from most accessible to least. The priority order reflects how users and assistive technologies interact with the page.

## Query Priority (Use This Order)

### 1. Accessible to Everyone

```typescript
// By ARIA role — the #1 preferred query
screen.getByRole('button', { name: 'Connect to Spotify' });
screen.getByRole('heading', { name: 'Settings' });
screen.getByRole('textbox', { name: 'Search tracks' });
screen.getByRole('slider', { name: 'Volume' });

// By label text — for form elements
screen.getByLabelText('API Key');
screen.getByLabelText('Enable auto-play');

// By placeholder text — when no label exists
screen.getByPlaceholderText('Search for music...');

// By visible text content
screen.getByText('Connected');
screen.getByText(/daft punk/i);  // Regex for partial/case-insensitive
```

### 2. Semantic Queries

```typescript
// By alt text — for images
screen.getByAltText('Album cover');

// By title attribute
screen.getByTitle('Close dialog');

// By display value — for form inputs
screen.getByDisplayValue('user@example.com');
```

### 3. Last Resort

```typescript
// By test ID — only when nothing else works
screen.getByTestId('volume-slider-track');
```

## Query Variants: getBy vs queryBy vs findBy

| Variant | No Match | Multiple Matches | Async? | Use When |
|---------|----------|------------------|--------|----------|
| `getBy` | ❌ Throws | ❌ Throws | No | Element should exist now |
| `queryBy` | Returns `null` | ❌ Throws | No | Element might not exist |
| `findBy` | ❌ Throws (timeout) | ❌ Throws | Yes ✅ | Element appears after async action |
| `getAllBy` | ❌ Throws | Returns array | No | Multiple elements expected |

### Examples

```typescript
// Element SHOULD exist — throws if missing
const button = screen.getByRole('button', { name: 'Play' });

// Element MIGHT NOT exist — returns null
const error = screen.queryByText('Error loading tracks');
expect(error).not.toBeInTheDocument();

// Element WILL appear after async operation
const results = await screen.findByText('Get Lucky');

// Multiple elements expected
const tracks = screen.getAllByRole('listitem');
expect(tracks).toHaveLength(5);
```

## How DJ.ai Uses Queries

DJ.ai components follow WCAG AA accessibility standards, which naturally aligns with RTL's query priority:

```typescript
// Settings component — querying by role
test('shows provider connection buttons', () => {
  render(<Settings providers={mockProviders} />);

  expect(screen.getByRole('button', { name: /connect.*apple/i }))
    .toBeInTheDocument();
  expect(screen.getByRole('button', { name: /connect.*spotify/i }))
    .toBeInTheDocument();
});

// OnboardingWizard — querying by text and role
test('navigates to next step', async () => {
  render(<OnboardingWizard onComplete={vi.fn()} />);

  const nextButton = screen.getByRole('button', { name: /next/i });
  await userEvent.click(nextButton);

  expect(screen.getByText('Step 2')).toBeInTheDocument();
});

// Checking absence of element
test('hides error when valid', () => {
  render(<ApiKeyInput value="valid-key" />);

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
```

## Common Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Using `getByTestId` first | Bypasses accessibility | Use `getByRole` or `getByLabelText` |
| Case-sensitive text matching | Fragile to text changes | Use regex: `/connect/i` |
| `getBy` when element may be absent | Test crashes instead of failing | Use `queryBy` for absence checks |
| `getBy` for async content | Element hasn't rendered yet | Use `findBy` (auto-retries) |

## Key Takeaways

- Query by role first — it's the most accessible and maintainable approach
- `getBy` for elements that must exist, `queryBy` for elements that might not, `findBy` for async elements
- Regex matching (`/text/i`) is more resilient than exact string matching
- If you can't find an element by role or label, the component may have an accessibility gap

## DJ.ai Connection

DJ.ai's WCAG AA compliance makes role-based queries the natural choice. Every interactive element has proper ARIA attributes (`aria-label`, `role`, `aria-valuenow`), so `getByRole` works reliably throughout the test suite. When a component is hard to query by role, it flags an accessibility issue that should be fixed in the source.

## Further Reading

- [Queries — About](https://testing-library.com/docs/queries/about)
- [ByRole Query](https://testing-library.com/docs/queries/byrole)
- [Query Priority Guide](https://testing-library.com/docs/queries/about#priority)
