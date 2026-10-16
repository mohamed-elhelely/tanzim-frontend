import { expect, test } from '@playwright/test';
import { MockApi, MockSocket, signIn } from './support/mock-api';

test('switching to Arabic turns the page right-to-left', async ({ page }) => {
  const api = new MockApi(page);
  await api.install();
  await new MockSocket(page).install();
  await signIn(page, api);

  await page.goto('/dashboard');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

  await page.getByRole('button', { name: 'العربية' }).click();

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
});
