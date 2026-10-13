import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { defaultSiteAnimations, normalizeSiteAnimations, type SiteAnimations } from '../src/types/site-animations';
import { chooseFoodLoadingScene, foodLoadingScenes, getFoodLoadingScene } from '../src/utils/food-loader';
import { bootBackgroundPalettes, bootLoaderStyles, chooseBootBackgroundPalette, chooseBootLoaderStyle, getBootLoaderStyle, shouldWaitForBootImage } from '../src/utils/boot-loader';

test('food loading animation defaults on and older saved settings remain compatible', () => {
  expect(defaultSiteAnimations.foodLoader).toBe(true);
  expect(defaultSiteAnimations.foodLoaderRandom).toBe(true);
  expect(defaultSiteAnimations.foodLoaderScene).toBe('pizza');
  expect(defaultSiteAnimations.heroSlideshow).toBe(true);
  expect(normalizeSiteAnimations({ enabled: false }).foodLoader).toBe(true);
  expect(normalizeSiteAnimations({ foodLoader: false }).foodLoader).toBe(false);
  expect(normalizeSiteAnimations({ foodLoaderScene: 'invalid' as SiteAnimations['foodLoaderScene'] }).foodLoaderScene).toBe('pizza');
  expect(normalizeSiteAnimations({ heroSlideshow: false }).heroSlideshow).toBe(false);
  expect(normalizeSiteAnimations({ heroSlideshow: 'invalid' as unknown as boolean }).heroSlideshow).toBe(true);
  expect(defaultSiteAnimations.bootLoader).toBe(true);
  expect(defaultSiteAnimations.bootLoaderRandom).toBe(true);
  expect(defaultSiteAnimations.bootLoaderStyle).toBe('orbit');
  expect(normalizeSiteAnimations({ enabled: false }).bootLoader).toBe(true);
  expect(normalizeSiteAnimations({ bootLoader: false }).bootLoader).toBe(false);
  expect(normalizeSiteAnimations({ bootLoaderStyle: 'unknown' as SiteAnimations['bootLoaderStyle'] }).bootLoaderStyle).toBe('orbit');
});

test('boot loader offers 18 selectable styles and random style selection stays in range', () => {
  expect(bootLoaderStyles).toHaveLength(18);
  expect(bootBackgroundPalettes).toHaveLength(12);
  expect(getBootLoaderStyle('compass')).toBe('compass');
  expect(getBootLoaderStyle('unknown')).toBe('orbit');
  expect(chooseBootLoaderStyle(0)).toBe('orbit');
  expect(chooseBootLoaderStyle(0.999)).toBe('diamond');
  for (let previous = 0; previous < bootBackgroundPalettes.length; previous += 1) {
    expect(chooseBootBackgroundPalette(previous, 0).index).not.toBe(previous);
    expect(chooseBootBackgroundPalette(previous, 0.999).index).not.toBe(previous);
  }
});

test('boot loader waits only for eager and initially visible lazy images', () => {
  expect(shouldWaitForBootImage({ loading: 'eager', top: 3000, bottom: 3400, viewportHeight: 800 })).toBe(true);
  expect(shouldWaitForBootImage({ loading: 'lazy', top: 1000, bottom: 1400, viewportHeight: 800 })).toBe(true);
  expect(shouldWaitForBootImage({ loading: 'lazy', top: 1500, bottom: 1900, viewportHeight: 800 })).toBe(false);
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
    <div class="site-animation-scope" data-site-animation-loader="true" data-site-initial-boot-pending="true">
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
  await expect(loader).toBeHidden();
  await page.locator('.site-animation-scope').evaluate((scope) => scope.removeAttribute('data-site-initial-boot-pending'));
  await expect(loader).toBeVisible();
  await page.locator('.site-animation-scope').evaluate((scope) => {
    scope.insertAdjacentHTML('beforeend', '<div class="boot-loading-overlay" role="status"></div>');
  });
  await expect(loader).toBeHidden();
  await page.locator('.boot-loading-overlay').evaluate((bootLoader) => bootLoader.remove());
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

test('homepage hero carousel advances automatically with a fade', async ({ page }) => {
  await page.goto('/');
  const heroSelector = page.locator('.customer-site main [aria-label$="homepage image selector"]');
  await expect(heroSelector).toBeVisible();
  const imageButtons = heroSelector.getByRole('button');
  expect(await imageButtons.count()).toBeGreaterThan(1);
  const initiallyActive = await heroSelector.locator('[aria-current="true"]').getAttribute('aria-label');

  await expect.poll(
    () => heroSelector.locator('[aria-current="true"]').getAttribute('aria-label'),
    { timeout: 8000 },
  ).not.toBe(initiallyActive);
  const heroImage = page.locator('.customer-site main img.hero-carousel-image');
  await expect(heroImage).toBeVisible();
  await expect(heroImage).toHaveCSS('animation-name', 'hero-carousel-fade');
});

test('authentication pages do not receive website animations', async ({ page }) => {
  await page.goto('/forgot-password');

  const scope = page.locator('.site-animation-scope');
  await expect(scope).not.toHaveAttribute('data-site-animation-brand', 'true');
  await expect(scope).not.toHaveAttribute('data-site-animation-content', 'true');
  await expect(scope).not.toHaveAttribute('data-site-animation-actions', 'true');
});

test('boot animation uses the current restaurant name and logo', async ({ page }) => {
  let releasePlacement: (() => void) | undefined;
  const placementGate = new Promise<void>((resolve) => { releasePlacement = resolve; });
  await page.route('**/api/advertisements?placement=*', async (route) => {
    await placementGate;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { localAdsEnabled: false, campaigns: [], adsense: null } }),
    });
  });

  const placementRequest = page.waitForRequest('**/api/advertisements?placement=*');
  await page.goto('/');
  await placementRequest;
  const bootLoader = page.locator('.boot-loading-overlay');
  await expect(bootLoader).toBeVisible();
  const headerBrand = (await page.locator('.customer-site header p').first().textContent() || '').trim();
  await expect(bootLoader).toHaveAttribute('aria-label', `Loading ${headerBrand}`);
  await expect(bootLoader.locator('.boot-loading-brand')).toHaveText(headerBrand);

  const headerLogo = page.locator('header img').first();
  const bootLogo = bootLoader.locator('.boot-loader-logo');
  if (await headerLogo.count()) {
    await expect(bootLogo).toHaveAttribute('src', await headerLogo.getAttribute('src') || '');
  } else {
    await expect(bootLogo).toHaveCount(0);
  }

  releasePlacement?.();
  await expect(bootLoader).toBeHidden({ timeout: 15_000 });
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
  const bootLoader = page.locator('.boot-loading-overlay');
  await expect(bootLoader).toBeVisible();
  const headerBrand = (await page.locator('.customer-site header p').first().textContent() || '').trim();
  await expect(bootLoader).toHaveAttribute('aria-label', `Loading ${headerBrand}`);
  await expect(bootLoader.locator('.boot-loading-brand')).toHaveText(headerBrand);
  await expect(bootLoader.locator('.boot-loading-backdrop')).toBeVisible();
  const colorClouds = bootLoader.locator('[data-boot-color]');
  await expect(colorClouds).toHaveCount(12);
  const backgroundMotionNames = await colorClouds.evaluateAll((clouds) => (
    clouds.map((cloud) => getComputedStyle(cloud).animationName)
  ));
  expect(new Set(backgroundMotionNames).size).toBe(12);
  const colorCloudStyles = await colorClouds.evaluateAll((clouds) => clouds.map((cloud) => {
    const style = getComputedStyle(cloud);
    return { color: style.backgroundImage, duration: Number.parseFloat(style.animationDuration) };
  }));
  expect(new Set(colorCloudStyles.map((cloud) => cloud.color)).size).toBe(12);
  expect(colorCloudStyles.every((cloud) => cloud.duration >= 34)).toBe(true);
  const foodParticles = bootLoader.locator('[data-food-particle]');
  await expect(foodParticles).toHaveCount(18);
  const motionNames = await foodParticles.evaluateAll((particles) => (
    particles.map((particle) => getComputedStyle(particle).animationName)
  ));
  expect(new Set(motionNames).size).toBe(18);
  const viewport = page.viewportSize();
  const overlayBounds = await bootLoader.boundingBox();
  expect(overlayBounds?.width).toBe(viewport?.width);
  expect(overlayBounds?.height).toBe(viewport?.height);
  const firstPalette = await bootLoader.getAttribute('data-boot-background-palette');
  const bootLogo = bootLoader.locator('.boot-loader-logo');
  const headerLogo = page.locator('header img').first();
  if (await headerLogo.count()) {
    await expect(bootLogo).toHaveCount(1);
    await expect(bootLogo).toHaveCSS('border-radius', '50%');
    await expect(bootLogo).toHaveCSS('object-fit', 'cover');
    await expect(bootLogo).toHaveAttribute('src', await headerLogo.getAttribute('src') || '');
  } else {
    await expect(bootLogo).toHaveCount(0);
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
  await expect(bootLoader).not.toHaveAttribute('data-boot-background-palette', firstPalette || '');
  releasePlacement?.();
  await expect(bootLoader).toBeHidden({ timeout: 15_000 });
});
