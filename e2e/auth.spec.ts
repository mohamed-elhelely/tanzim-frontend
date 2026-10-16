import { expect, test } from '@playwright/test';
import { MockApi, MockSocket, accessToken, envelope, errorEnvelope, me, refreshToken } from './support/mock-api';

test.describe('sign in', () => {
  let api: MockApi;

  test.beforeEach(async ({ page }) => {
    api = new MockApi(page);
    await api.install();
    await new MockSocket(page).install();
    api.on('GET', 'company/v1/me/', envelope(me));
  });

  test('signs in and lands on the dashboard', async ({ page }) => {
    api.on('POST', 'login/', envelope({ access: accessToken, refresh: refreshToken, user: 'Test Admin', role: 'COMPANY' }));

    await page.goto('/auth/login');
    await page.locator('#email').fill('admin@test.local');
    await page.locator('#password').fill('secret-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(api.last('POST', 'login/')?.body).toEqual({ email: 'admin@test.local', password: 'secret-password' });
  });

  test('shows the server message for wrong credentials', async ({ page }) => {
    api.on('POST', 'login/', (route) =>
      route.fulfill({ status: 400, json: errorEnvelope(400, 'Unknown error', { non_field_errors: ['Invalid email or password.'] }) }),
    );

    await page.goto('/auth/login');
    await page.locator('#email').fill('admin@test.local');
    await page.locator('#password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});
