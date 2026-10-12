import { test, expect } from '@playwright/test';

test('email OTP reset verifies the code before accepting a new password', async ({ page }) => {
  const resetRequests: Array<Record<string, string>> = [];

  await page.route('**/api/auth/forgot', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
  await page.route('**/api/auth/reset', async (route) => {
    const body = route.request().postDataJSON() as Record<string, string>;
    resetRequests.push(body);

    if (body.action === 'verify-email-code') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, verified: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByRole('button', { name: 'Send reset code' }).click();
  await expect(page.getByLabel('Email reset code')).toBeVisible();
  await expect(page.getByText('If an account exists with that email, a reset code has been sent.')).toBeVisible();

  await page.getByLabel('Email reset code').fill('123456');
  await page.getByRole('button', { name: 'Verify OTP' }).click();
  await expect(page.getByLabel('New password')).toBeVisible();
  await expect(page.getByLabel('Confirm password')).toBeVisible();

  await page.getByLabel('New password').fill('password123');
  await page.getByLabel('Confirm password').fill('different123');
  await page.getByRole('button', { name: 'Reset Password' }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Passwords do not match.');
  expect(resetRequests).toHaveLength(1);

  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Reset Password' }).click();
  await expect(page.getByRole('status')).toHaveText('Your password has been reset. You can now sign in.');
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toHaveAttribute('href', '/login');
  expect(resetRequests[0]).toMatchObject({ action: 'verify-email-code', email: 'customer@example.com', code: '123456' });
  expect(resetRequests[1]).toMatchObject({ email: 'customer@example.com', code: '123456', password: 'password123', confirmPassword: 'password123' });
});

test('invalid email OTP keeps the user on the verification step', async ({ page }) => {
  await page.route('**/api/auth/forgot', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
  await page.route('**/api/auth/reset', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Invalid reset code or expired link.' }),
    });
  });

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByRole('button', { name: 'Send reset code' }).click();
  await page.getByLabel('Email reset code').fill('000000');
  await page.getByRole('button', { name: 'Verify OTP' }).click();

  await expect(page.locator('p[role="alert"]')).toHaveText('Invalid reset code or expired link.');
  await expect(page.getByLabel('Email reset code')).toBeVisible();
  await expect(page.getByLabel('New password')).toHaveCount(0);
});

test('email reset displays a safe error for non-JSON request failures', async ({ page }) => {
  await page.route('**/api/auth/forgot', async (route) => {
    await route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' });
  });

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByRole('button', { name: 'Send reset code' }).click();

  await expect(page.locator('p[role="alert"]')).toHaveText('Unable to process that request. Please try again.');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Email reset code')).toHaveCount(0);
});

test('email reset stays on the password step after a failed reset response', async ({ page }) => {
  await page.route('**/api/auth/forgot', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
  await page.route('**/api/auth/reset', async (route) => {
    if (route.request().postDataJSON().action === 'verify-email-code') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, verified: true }),
      });
      return;
    }
    await route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' });
  });

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByRole('button', { name: 'Send reset code' }).click();
  await page.getByLabel('Email reset code').fill('123456');
  await page.getByRole('button', { name: 'Verify OTP' }).click();
  await page.getByLabel('New password').fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Reset Password' }).click();

  await expect(page.locator('p[role="alert"]')).toHaveText('Unable to reset your password. Please try again.');
  await expect(page.getByLabel('New password')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(1);
});
