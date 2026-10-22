import { Collection, ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';
import type { AdCampaignPlacement, AdPopupFrequency, AdPopupPage } from '@/src/types/advertisements';
import { getDateInTimeZone } from '@/src/utils/advertisements';

export type AdCampaignStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'PAUSED' | 'REJECTED';
export type AdEventKind = 'impression' | 'click';

export interface AdCampaignDocument {
  _id?: ObjectId;
  title?: string;
  businessName: string;
  imageUrl: string;
  description?: string | null;
  destinationUrl: string;
  contactWhatsApp?: string | null;
  placement: AdCampaignPlacement;
  startsAt: Date;
  endsAt: Date;
  startsOn?: string | null;
  endsOn?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  enabled?: boolean;
  popupEnabled?: boolean;
  popupFullScreen?: boolean;
  popupPages?: AdPopupPage[];
  popupDurationSeconds?: number;
  closeDelaySeconds?: number;
  frequency?: AdPopupFrequency;
  price: number;
  status: AdCampaignStatus;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AdEventDocument {
  campaignId: ObjectId;
  kind: AdEventKind;
  sessionHash: string;
  day: string;
  createdAt: Date;
  expiresAt: Date;
}

let campaignsPromise: Promise<Collection<AdCampaignDocument>> | null = null;
let eventsPromise: Promise<Collection<AdEventDocument>> | null = null;

export async function getAdCampaignsCollection() {
  if (!campaignsPromise) {
    campaignsPromise = (async () => {
      const db = (await getDatabaseClient()).db(await getDatabaseName());
      const collection = db.collection<AdCampaignDocument>('ad_campaigns');
      await collection.createIndex({ status: 1, placement: 1, startsAt: 1, endsAt: 1 });
      await collection.createIndex({ createdAt: -1 });
      return collection;
    })().catch((error) => {
      campaignsPromise = null;
      throw error;
    });
  }
  return campaignsPromise;
}

export async function getAdCampaignEventsCollection() {
  if (!eventsPromise) {
    eventsPromise = (async () => {
      const db = (await getDatabaseClient()).db(await getDatabaseName());
      const collection = db.collection<AdEventDocument>('ad_campaign_events');
      await collection.createIndex({ campaignId: 1, kind: 1, day: 1, sessionHash: 1 }, { unique: true });
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      return collection;
    })().catch((error) => {
      eventsPromise = null;
      throw error;
    });
  }
  return eventsPromise;
}

export function toAdCampaignDto(campaign: AdCampaignDocument) {
  return {
    _id: campaign._id?.toHexString(),
    title: campaign.title || campaign.businessName,
    businessName: campaign.businessName,
    imageUrl: campaign.imageUrl,
    description: campaign.description || null,
    destinationUrl: campaign.destinationUrl,
    contactWhatsApp: campaign.contactWhatsApp || null,
    placement: campaign.placement,
    startsAt: campaign.startsAt.toISOString(),
    endsAt: campaign.endsAt.toISOString(),
    startsOn: campaign.startsOn || null,
    endsOn: campaign.endsOn || null,
    dailyStartTime: campaign.dailyStartTime || null,
    dailyEndTime: campaign.dailyEndTime || null,
    enabled: campaign.enabled ?? true,
    popupEnabled: campaign.popupEnabled ?? false,
    popupFullScreen: campaign.popupFullScreen ?? false,
    popupPages: campaign.popupPages || [],
    popupDurationSeconds: campaign.popupDurationSeconds ?? 0,
    closeDelaySeconds: campaign.closeDelaySeconds ?? 0,
    frequency: campaign.frequency || 'SESSION',
    price: campaign.price,
    status: campaign.status,
    contactEmail: campaign.contactEmail,
    contactPhone: campaign.contactPhone,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export async function recordAdEvent(campaignId: string, kind: AdEventKind, sessionId: string, now = new Date(), timeZone = 'Asia/Kolkata') {
  if (!ObjectId.isValid(campaignId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) return false;
  const day = getDateInTimeZone(now, timeZone);
  const sessionHash = createHash('sha256').update(sessionId).digest('hex');
  const events = await getAdCampaignEventsCollection();
  try {
    await events.insertOne({
      campaignId: new ObjectId(campaignId),
      kind,
      sessionHash,
      day,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    });
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return false;
    throw error;
  }
}

export async function removeAdSessionEvents(sessionId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) return;
  const sessionHash = createHash('sha256').update(sessionId).digest('hex');
  await (await getAdCampaignEventsCollection()).deleteMany({ sessionHash });
}

export async function getAdCampaignMetrics() {
  const events = await getAdCampaignEventsCollection();
  const groups = await events.aggregate<{ _id: { campaignId: ObjectId; kind: AdEventKind }; count: number }>([
    { $match: { expiresAt: { $gt: new Date() } } },
    { $group: { _id: { campaignId: '$campaignId', kind: '$kind' }, count: { $sum: 1 } } },
  ]).toArray();
  return groups.reduce<Record<string, { impressions: number; clicks: number }>>((result, group) => {
    const id = group._id.campaignId.toHexString();
    result[id] ||= { impressions: 0, clicks: 0 };
    result[id][group._id.kind === 'impression' ? 'impressions' : 'clicks'] = group.count;
    return result;
  }, {});
}
