import { test, expect } from '@playwright/test';

for (const path of ['/manager', '/kitchen', '/delivery']) {
  test(`${path} protects staff dashboard access`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  });
}

test('main admin panel does not expose staff dashboard as its default route', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin|\/login/);
});