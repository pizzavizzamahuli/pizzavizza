import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';
import { defaultWebsiteAppearance, type WebsiteAppearance } from '@/src/types/appearance';

export { defaultWebsiteAppearance, mergeWebsiteAppearance } from '@/src/types/appearance';
export type { WebsiteAppearance } from '@/src/types/appearance';

export type DistanceUnit = 'KM' | 'MILES';
export type DeliveryChargeType = 'FREE' | 'FIXED' | 'DISTANCE_BASED';


export interface RestaurantLocationSnapshot {
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RestaurantSettingsDocument {
  _id?: ObjectId;
  id?: string;
  restaurantName: string;
  logo?: string | null;
  poweredByName?: string | null;
  poweredByUrl?: string | null;
  appearance?: WebsiteAppearance;
  menuImage?: string | null;
  phone?: string | null;
  email?: string | null;
  supportEmail?: string | null;
  whatsappSupportNumber?: string | null;
  workingHours?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryRadius: number;
  deliveryRadiusUnit: DistanceUnit;
  deliveryChargeType: DeliveryChargeType;
  deliveryChargeValue: number;
  deliveryBaseDistance?: number;
  deliveryBaseCharge?: number;
  deliveryAdditionalChargePerKm?: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryMinimumOrder: number;
  codEnabled: boolean;
  manualPaymentEnabled: boolean;
  manualPaymentUpiId?: string | null;
  manualPaymentQrUrl?: string | null;
  manualPaymentBankDetails?: string | null;
  deliveryWhatsAppNumber?: string | null;
  chatbotEnabled: boolean;
  // Sensitive server-side API keys (not returned in public settings API)
  googleMapsServerApiKey?: string | null;
  razorpayKeySecret?: string | null;
  telegramBotToken?: string | null;
  cloudinaryApiSecret?: string | null;
  // Telegram integration settings
  telegramEnabled?: boolean;
  telegramOrderNotificationsEnabled?: boolean;
  telegramBookingNotificationsEnabled?: boolean;
  telegramPaymentNotificationsEnabled?: boolean;
  referralEnabled: boolean;
  referralReferrerRewardAmount: number;
  referralReferredRewardAmount: number;
  referralMinimumOrderAmount: number;
  onlinePaymentEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RESTAURANT_SETTINGS_COLLECTION = 'restaurant_settings';

let restaurantSettingsCollectionPromise: Promise<Collection<RestaurantSettingsDocument>> | null = null;

export async function getRestaurantSettingsCollection() {
  if (restaurantSettingsCollectionPromise) return restaurantSettingsCollectionPromise;

  restaurantSettingsCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<RestaurantSettingsDocument>(RESTAURANT_SETTINGS_COLLECTION);
    await collection.createIndex({ restaurantName: 1 });
    return collection;
  })();

  return restaurantSettingsCollectionPromise;
}

export async function getRestaurantSettings() {
  const col = await getRestaurantSettingsCollection();
  const settings = await col.findOne({});

  if (settings) {
    const defaults = {
      referralEnabled: true,
      referralReferrerRewardAmount: 50,
      referralReferredRewardAmount: 50,
      referralMinimumOrderAmount: 300,
    };
    const missingDefaults = Object.fromEntries(Object.entries(defaults).filter(([key]) => settings[key as keyof RestaurantSettingsDocument] === undefined));
    if (Object.keys(missingDefaults).length) {
      await col.updateOne({ _id: settings._id }, { $set: { ...missingDefaults, updatedAt: new Date() } });
    }
    return { ...defaults, ...settings, ...missingDefaults } as RestaurantSettingsDocument;
  }

  const now = new Date();
  const defaultSettings: RestaurantSettingsDocument = {
    restaurantName: 'Pizza Vizza',
    logo: null,
    poweredByName: null,
    poweredByUrl: null,
    appearance: defaultWebsiteAppearance,
    menuImage: null,
    phone: null,
    email: null,
    supportEmail: null,
    whatsappSupportNumber: null,
    workingHours: null,
    addressLine1: null,
    addressLine2: null,
    landmark: null,
    city: null,
    state: null,
    postalCode: null,
    country: null,
    googleMapsUrl: null,
    latitude: null,
    longitude: null,
    deliveryEnabled: false,
    pickupEnabled: true,
    deliveryRadius: 0,
    deliveryRadiusUnit: 'KM',
    deliveryChargeType: 'DISTANCE_BASED',
    deliveryChargeValue: 0,
    deliveryBaseDistance: 5,
    deliveryBaseCharge: 50,
    deliveryAdditionalChargePerKm: 10,
    freeDeliveryEnabled: false,
    freeDeliveryMinimumOrder: 0,
    codEnabled: true,
    manualPaymentEnabled: false,
    manualPaymentUpiId: null,
    manualPaymentQrUrl: null,
    manualPaymentBankDetails: null,
    onlinePaymentEnabled: false,
    chatbotEnabled: true,
    telegramEnabled: false,
    telegramOrderNotificationsEnabled: false,
    telegramBookingNotificationsEnabled: false,
    telegramPaymentNotificationsEnabled: false,
    referralEnabled: true,
    referralReferrerRewardAmount: 50,
    referralReferredRewardAmount: 50,
    referralMinimumOrderAmount: 300,
    createdAt: now,
    updatedAt: now,
  };

  const res = await col.insertOne(defaultSettings as RestaurantSettingsDocument);
  return { ...defaultSettings, _id: res.insertedId, id: res.insertedId.toHexString() } as RestaurantSettingsDocument;
}

export async function updateRestaurantSettings(updates: Partial<RestaurantSettingsDocument>) {
  const col = await getRestaurantSettingsCollection();
  const now = new Date();
  const settings = await getRestaurantSettings();

  const merged = {
    ...settings,
    ...updates,
    updatedAt: now,
  } as RestaurantSettingsDocument;

  await col.updateOne({ _id: settings._id }, { $set: { ...updates, updatedAt: now } });
  return merged;
}
