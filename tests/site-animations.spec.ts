import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { defaultSiteAnimations, normalizeSiteAnimations, type SiteAnimations } from '../src/types/site-animations';
import { chooseFoodLoadingScene, foodLoadingScenes, getFoodLoadingScene } from '../src/utils/food-loader';
import { bootLoaderStyles, chooseBootLoaderStyle, getBootLoaderStyle } from '../src/utils/boot-loader';

test('food loading animation defaults on and older saved settings remain compatible', () => {
  expect(defaultSiteAnimations.foodLoader).toBe(true);
  expect(defaultSiteAnimations.foodLoaderRandom).toBe(true);
  expect(defaultSiteAnimations.foodLoaderScene).toBe('pizza');
  expect(normalizeSiteAnimations({ enabled: false }).foodLoader).toBe(true);
  expect(normalizeSiteAnimations({ foodLoader: false }).foodLoader).toBe(false);
  expect(normalizeSiteAnimations({ foodLoaderScene: 'invalid' as SiteAnimations['foodLoaderScene'] }).foodLoaderScene).toBe('pizza');
  expect(defaultSiteAnimations.bootLoader).toBe(true);
  expect(defaultSiteAnimations.bootLoaderRandom).toBe(true);
  expect(defaultSiteAnimations.bootLoaderStyle).toBe('orbit');
  expect(normalizeSiteAnimations({ enabled: false }).bootLoader).toBe(true);
  expect(normalizeSiteAnimations({ bootLoader: false }).bootLoader).toBe(false);
  expect(normalizeSiteAnimations({ bootLoaderStyle: 'unknown' as SiteAnimations['bootLoaderStyle'] }).bootLoaderStyle).toBe('orbit');
});

test('boot loader offers 18 selectable styles and random style selection stays in range', () => {
  expect(bootLoaderStyles).toHaveLength(18);
  expect(getBootLoaderStyle('compass')).toBe('compass');
  expect(getBootLoaderStyle('unknown')).toBe('orbit');
  expect(chooseBootLoaderStyle(0)).toBe('orbit');
  expect(chooseBootLoaderStyle(0.999)).toBe('diamond');
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
      <div class="boot-loading-overlay" role="status">
        <div class="boot-loader-visual boot-loader-pulse"><span class="boot-loader-ring"></span></div>
      </div>
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
  await expect(page.locator('.boot-loader-pulse .boot-loader-ring')).toHaveCSS('animation-name', 'none');
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

test('boot animation waits for initial ad placements, skips client navigation, and returns on refresh', async ({ page }) => {
  let holdPlacement = true;
  let releasePlacement: (() => void) | undefined;
  let signalPlacementRequest: (() => void) | undefined;
  let placementRequest = new Promise<void>((resolve) => { signalPlacementRequest = resolve; });
  let placementGate = new Promise<void>((resolve) => { releasePlacement = resolve; });
  const placementResponse = {
    success: true,
    data: { localAdsEnabled: false, campaigns: [], adsense: null },
  };

  await page.route('**/api/advertisements?placement=*', async (route) => {
    if (holdPlacement) {
      holdPlacement = false;
      signalPlacementRequest?.();
      await placementGate;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(placementResponse) });
  });

  await page.goto('/');
  await placementRequest;
  const bootLoader = page.getByRole('status', { name: 'Loading Pizza Vizza' });
  await expect(bootLoader).toBeVisible();
  await expect(bootLoader.locator('.boot-loading-backdrop')).toBeVisible();
  const viewport = page.viewportSize();
  const overlayBounds = await bootLoader.boundingBox();
  expect(overlayBounds?.width).toBe(viewport?.width);
  expect(overlayBounds?.height).toBe(viewport?.height);
  const bootLogo = bootLoader.locator('.boot-loader-logo');
  if (await bootLogo.count()) {
    await expect(bootLogo).toHaveCSS('border-radius', '50%');
    await expect(bootLogo).toHaveCSS('object-fit', 'cover');
    const headerLogo = page.locator('header img').first();
    if (await headerLogo.count()) {
      await expect(bootLogo).toHaveAttribute('src', await headerLogo.getAttribute('src') || '');
    }
  }
  releasePlacement?.();
  await expect(bootLoader).toBeHidden({ timeout: 15_000 });

  await page.locator('a[href="/menu"]:visible').first().click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(bootLoader).toBeHidden();

  holdPlacement = true;
  placementRequest = new Promise<void>((resolve) => { signalPlacementRequest = resolve; });
  placementGate = new Promise<void>((resolve) => { releasePlacement = resolve; });
  const reload = page.reload();
  await placementRequest;
  await reload;
  await expect(bootLoader).toBeVisible();
  releasePlacement?.();
  await expect(bootLoader).toBeHidden({ timeout: 15_000 });
});
