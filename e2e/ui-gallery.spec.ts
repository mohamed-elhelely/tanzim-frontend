import { expect, test } from '@playwright/test';

/** The /ui gallery (dev builds only) renders every shared/ui component; no backend or sign-in involved. */
const pages = [
  { path: 'buttons', heading: 'Buttons' },
  { path: 'cards', heading: 'Cards' },
  { path: 'selects', heading: 'Selects' },
  { path: 'form-controls', heading: 'Toggles & passwords' },
  { path: 'dialogs', heading: 'Dialogs' },
];

for (const { path, heading } of pages) {
  test(`gallery page ${path} renders without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));

    await page.goto(`/ui/${path}`);
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(`^${heading}`) })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('gallery select writes the picked value', async ({ page }) => {
  await page.goto('/ui/selects');
  await page.getByRole('combobox', { name: 'Warehouse' }).first().click();
  await page.getByRole('option', { name: 'Cairo depot' }).click();
  await expect(page.getByText('value: 3')).toBeVisible();
});

test('gallery dialog opens with its footer and closes', async ({ page }) => {
  await page.goto('/ui/dialogs');
  await page.getByRole('button', { name: 'Open with footer' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this brand?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
});

test('gallery switches to Arabic and right-to-left', async ({ page }) => {
  await page.goto('/ui/buttons');
  await page.getByRole('button', { name: 'العربية (RTL)' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
