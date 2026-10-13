import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { defaultSiteAnimations, normalizeSiteAnimations, type SiteAnimations } from '../src/types/site-animations';
import { chooseFoodLoadingScene, foodLoadingScenes, getFoodLoadingScene } from '../src/utils/food-loader';

test('food loading animation defaults on and older saved settings remain compatible', () => {
  expect(defaultSiteAnimations.foodLoader).toBe(true);
  expect(defaultSiteAnimations.foodLoaderRandom).toBe(true);
  expect(defaultSiteAnimations.foodLoaderScene).toBe('pizza');
  expect(normalizeSiteAnimations({ enabled: false }).foodLoader).toBe(true);
  expect(normalizeSiteAnimations({ foodLoader: false }).foodLoader).toBe(false);
  expect(normalizeSiteAnimations({ foodLoaderScene: 'invalid' as SiteAnimations['foodLoaderScene'] }).foodLoaderScene).toBe('pizza');
});

test('animation effects loop when enabled and pause for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const stylesheet = await readFile(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');
  const animationCssStart = stylesheet.indexOf('@keyframes site-brand-float');
  expect(animationCssStart).toBeGreaterThanOrEqual(0);
  await page.setContent(`
    <style>${stylesheet.slice(animationCssStart)}</style>
    <div class="site-animation-scope" data-site-animation-brand="true" data-site-animation-content="true" data-site-animation-actions="true" data-site-animation-loader="true">
      <header><a href="/" data-site-animation-brand="true"><img src="#" alt="Brand"></a></header>
      <main><section id="content"></section><a id="action" class="bg-amber-600">Order</a></main>
      <div class="food-loading-overlay" role="status"><div class="food-loading-plate"><span class="food-loading-emoji">🍕</span></div></div>
    </div>
  `);

  const scope = page.locator('.site-animation-scope');
  await expect(scope).toHaveAttribute('data-site-animation-brand', 'true');
  await expect(scope).toHaveAttribute('data-site-animation-content', 'true');
  await expect(scope).toHaveAttribute('data-site-animation-actions', 'true');
  await expect(scope).toHaveAttribute('data-site-animation-loader', 'true');
  await expect(page.locator('header [data-site-animation-brand="true"] > img')).toHaveCSS('animation-name', 'site-brand-float');
  await expect(page.locator('#content')).toHaveCSS('animation-name', 'site-content-glow');
  await expect(page.locator('#action')).toHaveCSS('animation-name', 'site-action-pulse');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('header [data-site-animation-brand="true"] > img')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#content')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#action')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.food-loading-plate')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.food-loading-emoji')).toHaveCSS('animation-name', 'none');
});

test('food loader chooses varied scenes and respects the master switch', async ({ page }) => {
  expect(foodLoadingScenes).toHaveLength(18);
  expect(getFoodLoadingScene('sushi').emoji).toBe('🍣');
  expect(getFoodLoadingScene('waffle').message).toBe('Making it golden and crisp');
  expect(getFoodLoadingScene('ramen').emoji).toBe('🍜');
  expect(getFoodLoadingScene('missing').name).toBe('pizza');
  for (let index = 0; index < foodLoadingScenes.length; index += 1) {
    const { scene, index: selectedIndex } = chooseFoodLoadingScene(index, 0);
    expect(scene.name).not.toBe(foodLoadingScenes[index].name);
    expect(selectedIndex).not.toBe(index);
  }

  const stylesheet = await readFile(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');
  await page.setContent(`
    <style>${stylesheet}</style>
    <div class="site-animation-scope" data-site-animation-loader="true">
      <div class="food-loading-overlay" role="status" aria-label="Loading page">
        <div class="food-loading-card"><div class="food-loading-plate"><span class="food-loading-emoji">🍕</span></div></div>
      </div>
      <div class="food-loading-waffle"><span class="food-loading-emoji"></span></div>
      <div class="food-loading-dumplings"><span class="food-loading-emoji"></span></div>
      <div class="food-loading-salad"><span class="food-loading-emoji"></span></div>
      <div class="food-loading-milkshake"><span class="food-loading-emoji"></span></div>
      <div class="food-loading-croissant"><span class="food-loading-emoji"></span></div>
      <div class="food-loading-ramen"><span class="food-loading-emoji"></span></div>
    </div>
  `);
  const loader = page.getByRole('status', { name: 'Loading page' });
  await expect(loader).toBeVisible();
  for (const [scene, animation] of [
    ['waffle', 'food-waffle-flip'],
    ['dumplings', 'food-dumplings-bounce'],
    ['salad', 'food-salad-toss'],
    ['milkshake', 'food-milkshake-shake'],
    ['croissant', 'food-croissant-rise'],
    ['ramen', 'food-ramen-steam'],
  ]) {
    await expect(page.locator(`.food-loading-${scene} .food-loading-emoji`)).toHaveCSS('animation-name', animation);
  }
  const scope = page.locator('.site-animation-scope');
  await scope.evaluate((element) => element.removeAttribute('data-site-animation-loader'));
  await expect(loader).toBeHidden();
});

test('authentication pages do not receive website animations', async ({ page }) => {
  await page.goto('/forgot-password');

  const scope = page.locator('.site-animation-scope');
  await expect(scope).not.toHaveAttribute('data-site-animation-brand', 'true');
  await expect(scope).not.toHaveAttribute('data-site-animation-content', 'true');
  await expect(scope).not.toHaveAttribute('data-site-animation-actions', 'true');
});
