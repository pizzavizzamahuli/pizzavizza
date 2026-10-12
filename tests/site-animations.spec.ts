import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('animation effects loop when enabled and pause for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const stylesheet = await readFile(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');
  const animationCssStart = stylesheet.indexOf('@keyframes site-brand-float');
  expect(animationCssStart).toBeGreaterThanOrEqual(0);
  await page.setContent(`
    <style>${stylesheet.slice(animationCssStart)}</style>
    <div class="site-animation-scope" data-site-animation-brand="true" data-site-animation-content="true" data-site-animation-actions="true">
      <header><a href="/" data-site-animation-brand="true"><img src="#" alt="Brand"></a></header>
      <main><section id="content"></section><a id="action" class="bg-amber-600">Order</a></main>
    </div>
  `);

  const scope = page.locator('.site-animation-scope');
  await expect(scope).toHaveAttribute('data-site-animation-brand', 'true');
  await expect(scope).toHaveAttribute('data-site-animation-content', 'true');
  await expect(scope).toHaveAttribute('data-site-animation-actions', 'true');
  await expect(page.locator('header [data-site-animation-brand="true"] > img')).toHaveCSS('animation-name', 'site-brand-float');
  await expect(page.locator('#content')).toHaveCSS('animation-name', 'site-content-glow');
  await expect(page.locator('#action')).toHaveCSS('animation-name', 'site-action-pulse');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('header [data-site-animation-brand="true"] > img')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#content')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#action')).toHaveCSS('animation-name', 'none');
});

test('authentication pages do not receive website animations', async ({ page }) => {
  await page.goto('/forgot-password');

  const scope = page.locator('.site-animation-scope');
  await expect(scope).not.toHaveAttribute('data-site-animation-brand', 'true');
  await expect(scope).not.toHaveAttribute('data-site-animation-content', 'true');
  await expect(scope).not.toHaveAttribute('data-site-animation-actions', 'true');
});
