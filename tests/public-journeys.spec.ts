import { test, expect } from '@playwright/test';

const publicPages = [
  { path: '/', marker: 'Order, dine, and manage everything in one place.' },
  { path: '/menu', marker: 'Menu' },
  { path: '/dining', marker: 'Dining' },
  { path: '/login', marker: 'Sign in' },
  { path: '/register', marker: 'Create your account' },
];

for (const pageInfo of publicPages) {
  test(`${pageInfo.path} loads without horizontal overflow`, async ({ page }) => {
    const response = await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText(pageInfo.marker, { exact: false }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBeFalsy();
  });
}

test('consumer navigation exposes core journeys', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Menu' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dining' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Account' }).first()).toBeVisible();
});

test('admin route remains protected', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin(\/login)?/);
});

test('email verification journey exposes code and resend controls', async ({ page }) => {
  await page.goto('/verify-email?email=test%40example.com');
  await expect(page.getByRole('heading', { name: 'Confirm your contact details' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveValue('test@example.com');
  await expect(page.getByPlaceholder('Email 6-digit code')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resend email code' })).toBeVisible();
});

test('registration carries referral code into the verification journey', async ({ page }) => {
  let receivedReferralCode = '';
  await page.route('**/api/auth/register', async (route) => {
    const payload = route.request().postDataJSON() as { referralCode?: string };
    receivedReferralCode = payload.referralCode || '';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, requiresEmailVerification: true }) });
  });

  await page.goto('/register?ref=PZVABC123');
  await page.getByLabel('Full name').fill('Journey Customer');
  await page.getByLabel('Email').fill('journey@example.com');
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByLabel('Password').fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect.poll(() => receivedReferralCode).toBe('PZVABC123');
  await expect(page).toHaveURL(/\/verify-email\?email=journey%40example\.com/);
});
