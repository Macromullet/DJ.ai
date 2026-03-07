# Playwright Selectors and Locators

## Concept

Playwright's **locator** API is the recommended way to find elements on a page. Locators are strict (fail if multiple matches), auto-wait (retry until the element is ready), and composable (chain for precision). Like React Testing Library, Playwright prioritizes accessible selectors.

## Built-in Locators (Preferred)

### By Role (Best Practice)

```typescript
// Button by accessible name
page.getByRole('button', { name: 'Connect to Spotify' });

// Heading
page.getByRole('heading', { name: 'Welcome to DJ.ai' });

// Text input
page.getByRole('textbox', { name: 'Search tracks' });

// Checkbox/switch
page.getByRole('checkbox', { name: 'Enable auto-play' });

// Link
page.getByRole('link', { name: 'Learn more' });
```

### By Text

```typescript
// Exact text
page.getByText('Connected');

// Partial/regex match
page.getByText(/get lucky/i);
```

### By Label

```typescript
// Form inputs by their associated label
page.getByLabel('API Key');
page.getByLabel('Volume');
```

### By Placeholder

```typescript
page.getByPlaceholder('Search for music...');
```

### By Test ID (Last Resort)

```typescript
page.getByTestId('visualizer-canvas');
```

## Locator Chaining

Narrow down matches by chaining locators:

```typescript
// Find the "Connect" button inside the Spotify settings section
const spotifySection = page.getByRole('region', { name: 'Spotify' });
const connectButton = spotifySection.getByRole('button', { name: 'Connect' });
await connectButton.click();

// Find a specific track in a list
const trackList = page.getByRole('list', { name: 'Search results' });
const firstTrack = trackList.getByRole('listitem').first();
```

## CSS and XPath Locators

Available but discouraged — they're less readable and more fragile:

```typescript
// CSS selector (avoid when possible)
page.locator('.settings-panel .btn-connect');

// XPath (avoid)
page.locator('//button[contains(text(), "Connect")]');
```

## Auto-Waiting

Playwright locators automatically wait for elements to be:
1. **Attached** to the DOM
2. **Visible** (not hidden)
3. **Stable** (not animating)
4. **Enabled** (not disabled)
5. **Receiving events** (not obscured by overlays)

```typescript
// No explicit wait needed — Playwright retries until element is actionable
await page.getByRole('button', { name: 'Play' }).click();
// Playwright waits up to 30s (default) for the button to be clickable
```

## Filtering

```typescript
// Filter by text content
page.getByRole('listitem').filter({ hasText: 'Daft Punk' });

// Filter by child element
page.getByRole('listitem').filter({
  has: page.getByRole('button', { name: 'Play' })
});

// Nth element
page.getByRole('listitem').nth(2);  // Third item (0-indexed)
page.getByRole('listitem').first();
page.getByRole('listitem').last();
```

## How DJ.ai Uses Locators

```typescript
// E2E: Complete onboarding flow
test('user completes onboarding wizard', async ({ page }) => {
  await page.goto('/');

  // Step 1: Welcome
  await expect(page.getByRole('heading', { name: /welcome/i }))
    .toBeVisible();

  await page.getByRole('button', { name: /next/i }).click();

  // Step 2: Provider selection
  await page.getByRole('button', { name: /apple music/i }).click();

  // Step 3: Complete
  await page.getByRole('button', { name: /get started/i }).click();

  // Verify onboarding complete
  await expect(page.getByRole('heading', { name: /now playing/i }))
    .toBeVisible();
});
```

## Key Takeaways

- Use `getByRole` first — it's accessible, readable, and maintainable
- Locators auto-wait, eliminating most flakiness caused by timing issues
- Chain locators to narrow scope instead of using fragile CSS selectors
- Built-in filtering (`hasText`, `has`, `nth`) handles complex scenarios

## DJ.ai Connection

DJ.ai's WCAG AA compliance means all interactive elements have proper ARIA roles and labels, making Playwright's `getByRole` the natural selector strategy. E2E tests mirror how a real user would navigate the app — by reading button labels and headings, not by inspecting CSS classes.

## Further Reading

- [Playwright Locators](https://playwright.dev/docs/locators)
- [Locator Assertions](https://playwright.dev/docs/test-assertions)
- [Best Practices — Locators](https://playwright.dev/docs/best-practices#use-locators)
