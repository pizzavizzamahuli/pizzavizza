import { test, expect } from '@playwright/test';

test('verification resend rate limit is shown to the customer', async ({ page }) => {
  await page.route('**/api/auth/resend-verification', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Please wait one minute before requesting another code.' }),
    });
  });

  await page.goto('/verify-email?email=rate%40example.com');
  await page.getByRole('button', { name: 'Resend email code' }).click();
  await expect(page.getByText('Please wait one minute before requesting another code.')).toBeVisible();
});

test('verification success completes the customer journey', async ({ page }) => {
  await page.route('**/api/auth/verify-email', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.route('**/api/auth/verify-mobile', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.goto('/verify-email?email=verified%40example.com&mobile=9876543210');
  await page.getByPlaceholder('Email 6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByText('Email verified successfully.')).toBeVisible();
  await page.getByLabel('Mobile verification code').fill('654321');
  await page.getByRole('button', { name: 'Verify mobile' }).click();
  await expect(page.getByText('Mobile number verified successfully.')).toBeVisible();
  await expect(page).toHaveURL(/\/account/, { timeout: 2_000 });
});