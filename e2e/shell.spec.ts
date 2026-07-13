import { test, expect } from '@playwright/test';

// Phase 2 acceptance, deterministic: no token in this build, so the map does not initialize
// and the shell makes no external calls. Real Mapbox rendering is manual QA (needs a pk. token).
test.describe('map workspace shell', () => {
  test('renders heading, controls, map container, and attribution', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /pathfinder/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /radar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /theme/i })).toBeVisible();
    await expect(page.getByTestId('map-canvas')).toBeVisible();
    await expect(page.getByText(/OpenStreetMap/)).toBeVisible();
  });

  test('radar toggle flips aria-pressed', async ({ page }) => {
    await page.goto('/');
    const radar = page.getByRole('button', { name: /radar/i });
    await expect(radar).toHaveAttribute('aria-pressed', 'false');
    await radar.click();
    await expect(radar).toHaveAttribute('aria-pressed', 'true');
  });

  test('theme choice persists across reload', async ({ page }) => {
    await page.goto('/');
    const theme = page.getByRole('button', { name: /theme/i });
    await theme.click(); // system -> light
    await theme.click(); // light -> dark
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
