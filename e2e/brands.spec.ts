import { expect, test } from '@playwright/test';
import { MockApi, MockSocket, envelope, signIn } from './support/mock-api';

/** Brands is the smallest list + dialog form: it stands for every CRUD screen built with ServerTable and FormDialog. */
const brands = [
  { id: 1, name: 'Bosch', description: '', is_active: true },
  { id: 2, name: 'Makita', description: '', is_active: true },
];

test.describe('brands', () => {
  let api: MockApi;

  test.beforeEach(async ({ page }) => {
    api = new MockApi(page);
    await api.install();
    await new MockSocket(page).install();
    await signIn(page, api);
    api.on('GET', 'inventory/v1/brand/', (route) => {
      const search = new URL(route.request().url()).searchParams.get('search');
      const rows = search ? brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase())) : brands;
      return route.fulfill({ json: envelope(rows, rows.length) });
    });
  });

  test('lists brands and searches on Enter', async ({ page }) => {
    await page.goto('/inventory/brands');
    await expect(page.getByRole('cell', { name: 'Bosch' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Makita' })).toBeVisible();

    await page.getByPlaceholder('Search').first().fill('mak');
    await page.getByPlaceholder('Search').first().press('Enter');

    await expect(page.getByRole('cell', { name: 'Bosch' })).toBeHidden();
    await expect(page.getByRole('cell', { name: 'Makita' })).toBeVisible();
    expect(api.last('GET', 'inventory/v1/brand/')?.url.searchParams.get('search')).toBe('mak');
  });

  test('creates a brand from the dialog and reloads the list', async ({ page }) => {
    api.on('POST', 'inventory/v1/brand/', (route) => {
      brands.push({ id: 3, name: 'Stanley', description: '', is_active: true });
      return route.fulfill({ status: 201, json: envelope({ id: 3, name: 'Stanley', description: '', is_active: true }) });
    });

    await page.goto('/inventory/brands');
    await page.getByRole('button', { name: 'New brand' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#name').fill('Stanley');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('cell', { name: 'Stanley' })).toBeVisible();
    expect(api.last('POST', 'inventory/v1/brand/')?.body).toEqual(expect.objectContaining({ name: 'Stanley' }));
  });
});

