import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';
import { defaultWebsiteAppearance, type WebsiteAppearance } from '@/src/types/appearance';
import fs from 'fs';
import path from 'path';

export { defaultWebsiteAppearance, mergeWebsiteAppearance } from '@/src/types/appearance';
export type { WebsiteAppearance } from '@/src/types/appearance';

export type DistanceUnit = 'KM' | 'MILES';
export type DeliveryChargeType = 'FREE' | 'FIXED' | 'DISTANCE_BASED';
export type DeliveryAssignmentMode = 'MANUAL' | 'AUTOMATIC' | 'MANUAL_FALLBACK';
export type DeliveryAssignmentStrategy = 'LOWEST_WORKLOAD' | 'ROUND_ROBIN' | 'LEAST_RECENT';
export type RestaurantDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface RestaurantDaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface RestaurantSpecialDate {
  date: string;
  isOpen: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  label?: string | null;
}

export type RestaurantWeeklySchedule = Record<RestaurantDayKey, RestaurantDaySchedule>;


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

export interface HomepageImageDocument {
  id: string;
  imageUrl: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AboutImageDocument {
  id: string;
  imageUrl: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantSettingsDocument {
  _id?: ObjectId;
  id?: string;
  restaurantName: string;
  logo?: string | null;
  poweredByName?: string | null;
  poweredByUrl?: string | null;
  footerAddress?: string | null;
  appearance?: WebsiteAppearance;
  homeImage?: string | null;
  homeDescription?: string | null;
  homepageImages?: HomepageImageDocument[];
  aboutHeading?: string | null;
  aboutDescription?: string | null;
  aboutImages?: AboutImageDocument[];
  menuImage?: string | null;
  phone?: string | null;
  email?: string | null;
  supportEmail?: string | null;
  whatsappSupportNumber?: string | null;
  workingHours?: string | null;
  restaurantTimezone?: string;
  weeklySchedule?: RestaurantWeeklySchedule;
  specialDates?: RestaurantSpecialDate[];
  manualAvailabilityOverride?: 'OPEN' | 'CLOSED' | null;
  manualAvailabilityReason?: string | null;
  manualAvailabilityChangedAt?: Date | null;
  manualAvailabilityChangedBy?: string | null;
  deliveryVerificationRequired?: boolean;
  deliveryAssignmentMode: DeliveryAssignmentMode;
  deliveryAssignmentStrategy: DeliveryAssignmentStrategy;
  deliveryAssignmentEligibleStaffIds: string[];
  deliveryAssignmentLastStaffId?: string | null;
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
  manualPaymentBankingName?: string | null;
  manualPaymentAccountNumber?: string | null;
  manualPaymentIfscCode?: string | null;
  manualPaymentBankName?: string | null;
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

function cleanImageUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return !trimmed || trimmed === 'null' || trimmed === 'undefined' ? null : trimmed;
}

export const defaultWeeklySchedule: RestaurantWeeklySchedule = {
  monday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
  tuesday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
  wednesday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
  thursday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
  friday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
  saturday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
  sunday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
};

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
      restaurantName: 'Pizza Vizza',
      logo: null,
      poweredByName: null,
      poweredByUrl: null,
      footerAddress: null,
      homeImage: null,
      homeDescription: null,
      homepageImages: [],
      aboutHeading: 'Good food, made for good company.',
      aboutDescription: 'Drop in for a relaxed meal, order your favorites online, or let us bring the taste of Pizza Vizza to you.',
      aboutImages: [],
      menuImage: null,
      phone: null,
      email: null,
      supportEmail: null,
      whatsappSupportNumber: null,
      workingHours: null,
      restaurantTimezone: 'Asia/Kolkata',
      weeklySchedule: defaultWeeklySchedule,
      specialDates: [],
      manualAvailabilityOverride: null,
      manualAvailabilityReason: null,
      deliveryVerificationRequired: true,
      deliveryAssignmentMode: 'MANUAL' as DeliveryAssignmentMode,
      deliveryAssignmentStrategy: 'LOWEST_WORKLOAD' as DeliveryAssignmentStrategy,
      deliveryAssignmentEligibleStaffIds: [],
      deliveryAssignmentLastStaffId: null,
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
      deliveryRadiusUnit: 'KM' as DistanceUnit,
      deliveryChargeType: 'DISTANCE_BASED' as DeliveryChargeType,
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
      deliveryWhatsAppNumber: null,
      chatbotEnabled: true,
      onlinePaymentEnabled: false,
      referralEnabled: true,
      referralReferrerRewardAmount: 50,
      referralReferredRewardAmount: 50,
      referralMinimumOrderAmount: 300,
    };
    const missingDefaults = Object.fromEntries(Object.entries(defaults).filter(([key]) => settings[key as keyof RestaurantSettingsDocument] === undefined));
    const now = new Date();
    const weeklySchedule = { ...defaultWeeklySchedule, ...(settings.weeklySchedule || {}) };
    const homepageImages = Array.isArray(settings.homepageImages) && settings.homepageImages.length
      ? settings.homepageImages.map((image) => ({ ...image, imageUrl: cleanImageUrl(image.imageUrl) })).filter((image): image is typeof image & { imageUrl: string } => Boolean(image.imageUrl))
      : settings.homeImage
        ? [{ id: `legacy-${settings._id?.toHexString() || 'homepage'}`, imageUrl: cleanImageUrl(settings.homeImage), description: settings.homeDescription || null, sortOrder: 0, isActive: true, createdAt: settings.createdAt || now, updatedAt: now }].filter((image): image is typeof image & { imageUrl: string } => Boolean(image.imageUrl))
        : [];
    const brandingDir = path.join(process.cwd(), 'public', 'uploads', 'branding');
    const localBrandingFiles = fs.existsSync(brandingDir) ? fs.readdirSync(brandingDir).filter((file) => /\.(png|jpe?g|webp|gif)$/i.test(file)).sort() : [];
    const localMenuFile = localBrandingFiles.find((file) => file.toLowerCase().includes('menu') || /\.png$/i.test(file));
    const localHeroFiles = localBrandingFiles.filter((file) => file !== localMenuFile);
    const recoveredHomepageImages = homepageImages.length || !localHeroFiles.length
      ? homepageImages
      : localHeroFiles.map((file, index) => ({
        id: `recovered-home-${file}`,
        imageUrl: `/uploads/branding/${file}`,
        description: index === 0 ? settings.homeDescription || null : null,
        sortOrder: index,
        isActive: true,
        createdAt: settings.createdAt || now,
        updatedAt: now,
      }));
    const recoveredMenuImage = cleanImageUrl(settings.menuImage) || (localMenuFile ? `/uploads/branding/${localMenuFile}` : null);
    const recoveredFields = {
      ...missingDefaults,
      homepageImages: recoveredHomepageImages,
      ...(recoveredMenuImage && !settings.menuImage ? { menuImage: recoveredMenuImage } : {}),
    };
    if (Object.keys(recoveredFields).length || !Array.isArray(settings.homepageImages)) {
      await col.updateOne({ _id: settings._id }, { $set: { ...recoveredFields, updatedAt: now } });
    }
    return { ...defaults, ...settings, ...missingDefaults, homeImage: cleanImageUrl(settings.homeImage), homepageImages: recoveredHomepageImages, menuImage: recoveredMenuImage, logo: cleanImageUrl(settings.logo), weeklySchedule, specialDates: settings.specialDates || [], restaurantTimezone: settings.restaurantTimezone || 'Asia/Kolkata' } as RestaurantSettingsDocument;
  }

  const now = new Date();
  const defaultSettings: RestaurantSettingsDocument = {
    restaurantName: 'Pizza Vizza',
    logo: null,
    poweredByName: null,
    poweredByUrl: null,
    footerAddress: null,
    appearance: defaultWebsiteAppearance,
    homeImage: null,
    homeDescription: null,
    homepageImages: [],
    aboutHeading: 'Good food, made for good company.',
    aboutDescription: 'Drop in for a relaxed meal, order your favorites online, or let us bring the taste of Pizza Vizza to you.',
    aboutImages: [],
    menuImage: null,
    phone: null,
    email: null,
    supportEmail: null,
    whatsappSupportNumber: null,
    workingHours: null,
    restaurantTimezone: 'Asia/Kolkata',
    weeklySchedule: defaultWeeklySchedule,
    specialDates: [],
    manualAvailabilityOverride: null,
    manualAvailabilityReason: null,
    manualAvailabilityChangedAt: null,
    manualAvailabilityChangedBy: null,
    deliveryAssignmentMode: 'MANUAL',
    deliveryAssignmentStrategy: 'LOWEST_WORKLOAD',
    deliveryAssignmentEligibleStaffIds: [],
    deliveryAssignmentLastStaffId: null,
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
  const definedUpdates = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined)) as Partial<RestaurantSettingsDocument>;

  const merged = {
    ...settings,
    ...definedUpdates,
    updatedAt: now,
  } as RestaurantSettingsDocument;

  await col.updateOne({ _id: settings._id }, { $set: { ...definedUpdates, updatedAt: now } });
  return merged;
}
