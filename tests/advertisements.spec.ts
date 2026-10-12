import { test, expect, type Page } from '@playwright/test';
import { parseAdCampaign } from '../src/utils/ad-campaign-validation';
import { isAdSenseReady, isEligibleAdCampaign, effectiveAdCampaignStatus } from '../src/utils/advertisements';
import { defaultAdvertisementSettings } from '../src/types/advertisements';

declare global {
  interface Window {
    __testTcfListenerAdded?: boolean;
  }
}

async function installTestTcfApi(page: Page) {
  await page.addInitScript(() => {
    type TcfCallback = (data: {
      eventStatus: string;
      listenerId: number;
      purpose: { consents: Record<number, boolean> };
      vendor: { consents: Record<number, boolean> };
    }, success: boolean) => void;
    const listeners: TcfCallback[] = [];
    let accepted = false;
    const notify = () => listeners.forEach((callback) => callback({
      eventStatus: accepted ? 'useractioncomplete' : 'tcloaded',
      listenerId: 1,
      purpose: { consents: { 1: accepted } },
      vendor: { consents: { 755: accepted } },
    }, true));
    window.addEventListener('grant-test-ads-consent', () => {
      accepted = true;
      notify();
    });
    Object.defineProperty(window, '__tcfapi', {
      configurable: true,
      value: (command: string, _version: number, callback: TcfCallback, listenerId?: number) => {
        if (command === 'addEventListener') {
          window.__testTcfListenerAdded = true;
          listeners.push(callback);
          notify();
        } else {
          callback({
            eventStatus: 'tcloaded',
            listenerId: listenerId || 1,
            purpose: { consents: {} },
            vendor: { consents: {} },
          }, true);
        }
      },
    });
  });
}

async function waitForTcfListener(page: Page) {
  await page.waitForFunction(() => window.__testTcfListenerAdded === true);
}

test('ads are off by default and campaign approval dates determine serving eligibility', () => {
  expect(defaultAdvertisementSettings.adsenseEnabled).toBe(false);
  expect(defaultAdvertisementSettings.localAdsEnabled).toBe(false);
  expect(isAdSenseReady(defaultAdvertisementSettings)).toBe(false);
  expect(isAdSenseReady({
    ...defaultAdvertisementSettings,
    adsenseEnabled: true,
    adsenseSiteApproved: true,
    adsenseCmpConfigured: true,
    adsenseSlots: { ...defaultAdvertisementSettings.adsenseSlots, HOME: '1234567890' },
  })).toBe(true);

  const now = new Date('2026-10-12T12:00:00.000Z');
  const campaign = {
    status: 'APPROVED',
    startsAt: new Date('2026-10-12T11:00:00.000Z'),
    endsAt: new Date('2026-10-12T13:00:00.000Z'),
  };
  expect(isEligibleAdCampaign(campaign, now)).toBe(true);
  expect(isEligibleAdCampaign({ ...campaign, status: 'PAUSED' }, now)).toBe(false);
  expect(isEligibleAdCampaign({ ...campaign, startsAt: new Date('2026-10-12T13:00:00.000Z') }, now)).toBe(false);
  expect(isEligibleAdCampaign({ ...campaign, endsAt: new Date('2026-10-12T11:00:00.000Z') }, now)).toBe(false);
  expect(effectiveAdCampaignStatus({ ...campaign, startsAt: new Date('2026-10-12T13:00:00.000Z') }, now)).toBe('SCHEDULED');
  expect(effectiveAdCampaignStatus({ ...campaign, endsAt: new Date('2026-10-12T11:00:00.000Z') }, now)).toBe('EXPIRED');

  const payload = {
    businessName: 'Local Bakery',
    imageUrl: 'https://res.cloudinary.com/pizzavizza/image/upload/banner.webp',
    destinationUrl: 'https://bakery.example/',
    placement: 'HOME',
    startsAt: '2026-10-12T11:00:00.000Z',
    endsAt: '2026-10-12T13:00:00.000Z',
    price: 500,
    status: 'APPROVED',
  };
  expect(parseAdCampaign(payload, true, 'pizzavizza')?.status).toBe('APPROVED');
  expect(parseAdCampaign({ ...payload, destinationUrl: 'javascript:alert(1)' }, true, 'pizzavizza')).toBeNull();
  expect(parseAdCampaign({ ...payload, imageUrl: 'https://res.cloudinary.com/other/image/upload/banner.webp' }, true, 'pizzavizza')).toBeNull();
});

test('advertisement endpoints require admin authorization and consent choices are explicit', async ({ request }) => {
  test.skip(test.info().project.name === 'mobile', 'Server authorization contract does not depend on viewport.');
  test.setTimeout(90_000);
  const settings = await request.get('/api/admin/advertisements/settings');
  const campaigns = await request.get('/api/admin/advertisements/campaigns');
  expect(settings.status()).toBe(403);
  expect(campaigns.status()).toBe(403);

  const accepted = await request.post('/api/advertisements/consent', { data: { choice: 'accepted' } });
  expect(accepted.ok()).toBeTruthy();
  expect(accepted.headers()['set-cookie']).toContain('pv_local_ads_consent=accepted');
  expect(accepted.headers()['set-cookie']).toContain('HttpOnly');

  const rejected = await request.post('/api/advertisements/consent', { data: { choice: 'rejected' } });
  expect(rejected.ok()).toBeTruthy();
  expect(rejected.headers()['set-cookie']).toContain('pv_local_ads_consent=rejected');
});

test('local sponsored placements require opt-in, deduplicate tracking, and fit mobile width', async ({ page }) => {
  let choice: 'accepted' | 'rejected' | null = null;
  const events: Array<{ campaignId: string; kind: string }> = [];

  await page.route('**/api/advertisements?placement=HOME', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        localAdsEnabled: true,
        localAdsConsent: choice === 'accepted',
        localAdsChoice: choice,
        campaigns: choice === 'accepted' ? [{
          _id: '507f1f77bcf86cd799439011',
          businessName: 'Sample Local Bakery',
          imageUrl: 'https://res.cloudinary.com/sample/image/upload/banner.webp',
          destinationUrl: 'https://business.example/',
          placement: 'HOME',
        }] : [],
        adsense: null,
      },
    }),
  }));
  await page.route('**/api/advertisements/consent', async (route) => {
    choice = (route.request().postDataJSON() as { choice: 'accepted' | 'rejected' }).choice;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.route('**/api/advertisements/events', async (route) => {
    events.push(route.request().postDataJSON() as { campaignId: string; kind: string });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/webp', body: '' }));
  await page.goto('/');

  await expect(page.getByText('Local business advertisements')).toBeVisible();
  await expect(page.getByText('Sample Local Bakery')).toHaveCount(0);
  expect(events).toHaveLength(0);
  await page.getByRole('button', { name: 'Allow local sponsored ads' }).click();
  await expect(page.getByText('Sample Local Bakery')).toBeVisible();
  await expect(page.locator('#pizzavizza-adsense-script')).toHaveCount(0);
  const card = page.locator('[data-local-ad-id="507f1f77bcf86cd799439011"]');
  const bounds = await card.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));

  const clickEvent = page.waitForRequest('**/api/advertisements/events');
  await card.getByRole('link').click();
  await clickEvent;
  expect(events.filter((event) => event.kind === 'click')).toHaveLength(1);
  expect(events.filter((event) => event.kind === 'impression').length).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Ad preferences' }).click();
  await page.getByRole('button', { name: 'Decline' }).click();
  await expect(page.getByText('Sample Local Bakery')).toHaveCount(0);
});

test('AdSense waits for TCF consent before injecting one script', async ({ page }) => {
  await installTestTcfApi(page);
  await page.route('**/api/advertisements?placement=HOME', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { localAdsEnabled: false, localAdsConsent: false, localAdsChoice: null, campaigns: [], adsense: { publisherId: 'ca-pub-9052453172321926', autoAds: false, slot: '1234567890' } } }),
  }));
  await page.route('**/api/advertisements?placement=MENU', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { localAdsEnabled: false, localAdsConsent: false, localAdsChoice: null, campaigns: [], adsense: { publisherId: 'ca-pub-9052453172321926', autoAds: false, slot: '1234567890' } } }),
  }));
  await page.route('https://pagead2.googlesyndication.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForTcfListener(page);
  await expect(page.locator('#pizzavizza-adsense-script')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('grant-test-ads-consent')));
  await expect(page.locator('#pizzavizza-adsense-script')).toHaveCount(1);
  await expect(page.locator('ins.adsbygoogle')).toHaveCount(1);
});

test('AdSense Auto ads loads its script without a slot after TCF consent', async ({ page }) => {
  await installTestTcfApi(page);
  await page.route('**/api/advertisements?placement=HOME', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        localAdsEnabled: false,
        localAdsConsent: false,
        localAdsChoice: null,
        campaigns: [],
        adsense: { publisherId: 'ca-pub-9052453172321926', autoAds: true, slot: null },
      },
    }),
  }));
  await page.route('https://pagead2.googlesyndication.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForTcfListener(page);
  await expect(page.locator('#pizzavizza-adsense-script')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('grant-test-ads-consent')));
  await expect(page.locator('#pizzavizza-adsense-script')).toHaveCount(1);
  await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
});

test('password-reset pages do not request or load ads', async ({ page }) => {
  const adRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/advertisements')) adRequests.push(request.url());
  });
  await page.goto('/forgot-password');
  await expect(page.locator('#pizzavizza-adsense-script')).toHaveCount(0);
  expect(adRequests).toHaveLength(0);
});
