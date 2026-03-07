# Playwright Assertions

## Concept

Playwright provides **auto-retrying assertions** via `expect(locator)` that automatically wait for conditions to be met before passing or failing. This eliminates the need for explicit waits and makes tests more reliable and readable.

Unlike Node.js `assert` or generic `expect` libraries, Playwright's assertions understand the asynchronous nature of web pages — they retry until the condition is true or the timeout expires.

## Web-First Assertions (Recommended)

These assertions auto-retry and are the preferred approach:

### Visibility

```typescript
// Element is visible
await expect(page.getByRole('heading', { name: 'DJ.ai' }))
  .toBeVisible();

// Element is hidden/not in DOM
await expect(page.getByText('Loading...'))
  .toBeHidden();

// Element is NOT visible (different from toBeHidden)
await expect(page.getByRole('alert'))
  .not.toBeVisible();
```

### Text Content

```typescript
// Has exact text
await expect(page.getByRole('status'))
  .toHaveText('Connected');

// Contains text (partial match)
await expect(page.getByRole('status'))
  .toContainText('Connected');

// Has text matching regex
await expect(page.getByRole('heading'))
  .toHaveText(/welcome.*dj\.ai/i);
```

### Input Values

```typescript
// Input has specific value
await expect(page.getByLabel('API Key'))
  .toHaveValue('AIzaSy-test-key');

// Input is empty
await expect(page.getByLabel('Search'))
  .toHaveValue('');
```

### Element State

```typescript
// Enabled/disabled
await expect(page.getByRole('button', { name: 'Save' }))
  .toBeEnabled();

await expect(page.getByRole('button', { name: 'Next' }))
  .toBeDisabled();

// Checked (checkbox/radio/switch)
await expect(page.getByRole('checkbox', { name: 'Auto-play' }))
  .toBeChecked();

// Focused
await expect(page.getByRole('textbox', { name: 'Search' }))
  .toBeFocused();
```

### URL and Title

```typescript
// Page URL
await expect(page).toHaveURL('http://localhost:5173/settings');
await expect(page).toHaveURL(/\/settings$/);

// Page title
await expect(page).toHaveTitle('DJ.ai');
```

### Count

```typescript
// Number of matching elements
await expect(page.getByRole('listitem'))
  .toHaveCount(5);
```

### CSS Properties

```typescript
// Has CSS class
await expect(page.getByRole('button', { name: 'Play' }))
  .toHaveClass(/active/);

// Has specific attribute
await expect(page.getByRole('slider'))
  .toHaveAttribute('aria-valuenow', '75');
```

## Auto-Retry Behavior

Playwright assertions retry until:
1. The condition is met → **PASS**
2. The timeout expires → **FAIL**

Default timeout is 5 seconds (configurable per-test or globally).

```typescript
// Custom timeout for slow operations
await expect(page.getByText('Search results'))
  .toBeVisible({ timeout: 10000 }); // 10 seconds
```

## Soft Assertions

Continue test execution even if an assertion fails:

```typescript
// Soft assertion — doesn't stop the test
await expect.soft(page.getByText('Header'))
  .toBeVisible();

await expect.soft(page.getByText('Footer'))
  .toBeVisible();

// Test continues, reports all failures at the end
```

## How DJ.ai Uses Assertions

```typescript
test('search returns visible results', async ({ page }) => {
  await page.goto('/');

  // Type search query
  await page.getByRole('textbox', { name: /search/i }).fill('Daft Punk');
  await page.getByRole('button', { name: /search/i }).click();

  // Assert results appear (auto-retries while loading)
  await expect(page.getByRole('list', { name: /results/i }))
    .toBeVisible();

  await expect(page.getByRole('listitem'))
    .toHaveCount(expect.any(Number));  // At least some results

  // Assert specific result
  await expect(page.getByText(/get lucky/i))
    .toBeVisible();
});
```

## Key Takeaways

- Always use web-first assertions (`expect(locator)`) — they auto-retry and handle async DOM updates
- `toBeVisible()` is the most common assertion for verifying UI state
- `not.toBeVisible()` vs `toBeHidden()` — both work, but `toBeHidden` also matches elements not in the DOM
- Custom timeouts handle slow operations without blanket sleep calls
- Soft assertions let you check multiple things without stopping at the first failure

## DJ.ai Connection

Playwright assertions in DJ.ai leverage the app's accessible markup. Assertions like `toHaveAttribute('aria-valuenow', '75')` verify both functionality and accessibility simultaneously. The auto-retry behavior handles DJ.ai's async operations (API calls, MusicKit loading) without explicit waits.

## Further Reading

- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
- [Auto-Retrying Assertions](https://playwright.dev/docs/test-assertions#auto-retrying-assertions)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
