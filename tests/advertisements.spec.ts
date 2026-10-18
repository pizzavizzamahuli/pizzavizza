import { test, expect, type Page } from '@playwright/test';
import { parseAdCampaign } from '../src/utils/ad-campaign-validation';
import { getDateInTimeZone, isAdSenseReady, isCampaignWithinSchedule, isEligibleAdCampaign, effectiveAdCampaignStatus, shouldShowPopupForFrequency } from '../src/utils/advertisements';
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
  expect(isEligibleAdCampaign({ ...campaign, status: 'ACTIVE' }, now)).toBe(true);
  expect(isEligibleAdCampaign({ ...campaign, status: 'PAUSED' }, now)).toBe(false);
  expect(isEligibleAdCampaign({ ...campaign, startsAt: new Date('2026-10-12T13:00:00.000Z') }, now)).toBe(false);
  expect(isEligibleAdCampaign({ ...campaign, endsAt: new Date('2026-10-12T11:00:00.000Z') }, now)).toBe(false);
  expect(effectiveAdCampaignStatus({ ...campaign, startsAt: new Date('2026-10-12T13:00:00.000Z') }, now)).toBe('SCHEDULED');
  expect(effectiveAdCampaignStatus({ ...campaign, endsAt: new Date('2026-10-12T11:00:00.000Z') }, now)).toBe('EXPIRED');
  expect(getDateInTimeZone(new Date('2026-10-12T20:00:00.000Z'), 'Asia/Kolkata')).toBe('2026-10-13');
  expect(shouldShowPopupForFrequency('SESSION', false, true)).toBe(false);
  expect(shouldShowPopupForFrequency('SESSION', false, false)).toBe(true);
  expect(shouldShowPopupForFrequency('DAILY', true, false)).toBe(false);
  expect(shouldShowPopupForFrequency('DAILY', false, true)).toBe(true);
  expect(shouldShowPopupForFrequency('EVERY_VISIT', true, true)).toBe(true);
  const scheduled = {
    ...campaign,
    startsOn: '2026-10-12',
    endsOn: '2026-10-12',
    dailyStartTime: '10:00',
    dailyEndTime: '18:00',
  };
  expect(isCampaignWithinSchedule(scheduled, new Date('2026-10-12T05:00:00.000Z'), 'Asia/Kolkata')).toBe(true);
  expect(isCampaignWithinSchedule(scheduled, new Date('2026-10-12T13:00:00.000Z'), 'Asia/Kolkata')).toBe(false);
  expect(isCampaignWithinSchedule({ ...scheduled, startsOn: '2026-10-13' }, new Date('2026-10-12T05:00:00.000Z'), 'Asia/Kolkata')).toBe(false);
  expect(isCampaignWithinSchedule({ ...scheduled, dailyStartTime: '20:00', dailyEndTime: '06:00' }, new Date('2026-10-12T22:00:00.000Z'), 'Asia/Kolkata')).toBe(true);
  expect(isCampaignWithinSchedule({ ...scheduled, startsOn: '2026-10-13', dailyStartTime: '20:00', dailyEndTime: '06:00' }, new Date('2026-10-12T22:00:00.000Z'), 'Asia/Kolkata')).toBe(false);

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
  expect(parseAdCampaign({ ...payload, placement: 'NONE', popupEnabled: true, popupPages: ['HOME'] }, true, 'pizzavizza')?.placement).toBe('NONE');
  expect(parseAdCampaign({ ...payload, placement: 'INVALID' }, true, 'pizzavizza')).toBeNull();
  const popupPayload = {
    ...payload,
    title: 'Bakery offer',
    description: 'Fresh breads',
    startsOn: '2026-10-12',
    endsOn: '2026-10-20',
    dailyStartTime: '10:00',
    dailyEndTime: '20:00',
    enabled: true,
    popupEnabled: true,
    popupPages: ['HOME', 'MENU'],
    popupDurationSeconds: 0,
    closeDelaySeconds: 10,
    frequency: 'DAILY',
  };
  expect(parseAdCampaign(popupPayload, true, 'pizzavizza')?.closeDelaySeconds).toBe(10);
  for (const closeDelaySeconds of [0, 5, 10, 60]) {
    expect(parseAdCampaign({ ...popupPayload, closeDelaySeconds }, true, 'pizzavizza')?.closeDelaySeconds).toBe(closeDelaySeconds);
  }
  expect(parseAdCampaign({ ...popupPayload, closeDelaySeconds: 61 }, true, 'pizzavizza')).toBeNull();
  expect(parseAdCampaign({ ...popupPayload, closeDelaySeconds: -1 }, true, 'pizzavizza')).toBeNull();
  expect(parseAdCampaign({ ...popupPayload, popupDurationSeconds: 3601 }, true, 'pizzavizza')).toBeNull();
  expect(parseAdCampaign({ ...popupPayload, dailyStartTime: '09:00', dailyEndTime: undefined }, true, 'pizzavizza')).toBeNull();
  expect(parseAdCampaign({ ...popupPayload, contactWhatsApp: 'https://evil.example' }, true, 'pizzavizza')).toBeNull();
  expect(parseAdCampaign({ ...payload, destinationUrl: 'javascript:alert(1)' }, true, 'pizzavizza')).toBeNull();
  expect(parseAdCampaign({ ...payload, imageUrl: 'https://res.cloudinary.com/other/image/upload/banner.webp' }, true, 'pizzavizza')).toBeNull();
});

test('advertisement endpoints require admin authorization and measurement input is validated', async ({ request }) => {
  test.skip(test.info().project.name === 'mobile', 'Server authorization contract does not depend on viewport.');
  test.setTimeout(90_000);
  const settings = await request.get('/api/admin/advertisements/settings');
  const campaigns = await request.get('/api/admin/advertisements/campaigns');
  expect(settings.status()).toBe(403);
  expect(campaigns.status()).toBe(403);

  const measurement = await request.post('/api/advertisements/events', { data: {} });
  expect(measurement.status()).toBe(400);
});

test('local sponsored placements display without opt-in, skip measurement, and fit mobile width', async ({ page }) => {
  const events: Array<{ campaignId: string; kind: string }> = [];

  await page.route('**/api/advertisements?placement=HOME', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        localAdsEnabled: true,
        campaigns: [{
          _id: '507f1f77bcf86cd799439011',
          businessName: 'Sample Local Bakery',
          imageUrl: 'https://res.cloudinary.com/sample/image/upload/banner.webp',
          destinationUrl: 'https://business.example/',
          placement: 'HOME',
        }],
        adsense: null,
      },
    }),
  }));
  await page.route('**/api/advertisements/popup?page=HOME', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { campaigns: [], today: '2026-10-12' } }),
  }));
  await page.route('**/api/advertisements/events', async (route) => {
    events.push(route.request().postDataJSON() as { campaignId: string; kind: string });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/webp', body: '' }));
  await page.goto('/');

  await expect(page.getByText('Sample Local Bakery')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Allow local sponsored ads' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Decline' })).toHaveCount(0);
  await expect(page.locator('#pizzavizza-adsense-script')).toHaveCount(0);
  const card = page.locator('section[aria-label="Sponsored advertisements"] article').first();
  await card.scrollIntoViewIfNeeded();
  const bounds = await card.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
  expect((await page.context().cookies()).some((cookie) => cookie.name === 'pv_local_ads_consent')).toBe(false);
  await expect.poll(() => events).toHaveLength(1);
  expect(events[0]?.kind).toBe('impression');
  await page.getByRole('link', { name: /Sample Local Bakery/ }).click();
  await expect.poll(() => events).toHaveLength(2);
  expect(events[1]?.kind).toBe('click');
});

for (const delay of [0, 5, 10, 60]) {
  test(`local popup close button unlocks after exactly ${delay} seconds`, async ({ page }) => {
    const events: Array<{ campaignId: string; kind: string }> = [];
    await page.clock.install({ time: new Date('2026-10-12T12:00:00.000Z') });
    await page.route('**/api/advertisements/popup?page=HOME', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          today: '2026-10-12',
          campaigns: [{
            _id: `507f1f77bcf86cd7994390${String(delay).padStart(2, '0')}`,
            title: 'Local offer',
            businessName: 'Test local business',
            imageUrl: '',
            destinationUrl: 'https://business.example/',
            description: 'A sponsored local advertisement.',
            closeDelaySeconds: delay,
            popupDurationSeconds: 0,
            frequency: 'EVERY_VISIT',
          }],
        },
      }),
    }));
    await page.route('**/api/advertisements?placement=HOME', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { localAdsEnabled: false, campaigns: [], adsense: null } }),
    }));
    await page.route('**/api/advertisements?placement=MENU', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { localAdsEnabled: false, campaigns: [], adsense: null } }),
    }));
    await page.route('**/api/advertisements/events', async (route) => {
      events.push(route.request().postDataJSON() as { campaignId: string; kind: string });
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, recorded: true }) });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const dialog = page.getByRole('dialog', { name: 'Local offer' });
    await expect(dialog).toBeVisible();
    const closeButton = dialog.getByRole('button');
    if (delay > 0) {
      await expect(closeButton).toHaveText(`Close available in ${delay}s`);
      await expect(closeButton).toBeDisabled();
      if (delay > 1) {
        await page.clock.runFor((delay - 1) * 1000);
        await expect(closeButton).toBeDisabled();
      }
      await page.clock.runFor(1000);
    }
    await expect(closeButton).toBeEnabled();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    await closeButton.click();
    await expect(dialog).toHaveCount(0);
    expect(events.map((event) => event.kind)).toEqual(['impression']);
  });
}

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
