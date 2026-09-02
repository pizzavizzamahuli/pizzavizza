import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export type DiningRoomPricingType = 'FIXED' | 'PER_HOUR' | 'PER_BOOKING';

export interface DiningRoomDocument {
  _id?: ObjectId;
  id?: string;
  roomType: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  images: string[];
  capacityMin: number;
  capacityMax: number;
  roomCount: number;
  seatsPerRoom: number;
  pricingType: DiningRoomPricingType;
  price: number;
  bookingDurationMinutes: number;
  availableTimeSlots: string[];
  isActive: boolean;
  isBookable: boolean;
  displayOrder: number;
  amenities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DINING_ROOMS_COLLECTION = 'dining_rooms';

let diningRoomsCollectionPromise: Promise<Collection<DiningRoomDocument>> | null = null;

export async function getDiningRoomsCollection() {
  if (diningRoomsCollectionPromise) return diningRoomsCollectionPromise;

  diningRoomsCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<DiningRoomDocument>(DINING_ROOMS_COLLECTION);
    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.createIndex({ isActive: 1 });
    await collection.createIndex({ displayOrder: 1 });
    return collection;
  })();

  return diningRoomsCollectionPromise;
}

export async function listDiningRooms(filter: Partial<DiningRoomDocument> = {}) {
  const col = await getDiningRoomsCollection();
  return col.find(filter).sort({ displayOrder: 1, name: 1 }).toArray();
}

export async function findDiningRoomBySlug(slug: string) {
  const col = await getDiningRoomsCollection();
  return col.findOne({ slug });
}

export async function findDiningRoomById(id: string, session?: ClientSession) {
  const col = await getDiningRoomsCollection();
  return col.findOne({ _id: new ObjectId(id) }, { session });
}

export async function createDiningRoom(doc: Partial<DiningRoomDocument>) {
  const col = await getDiningRoomsCollection();
  const now = new Date();
  const toInsert: DiningRoomDocument = {
    roomType: (doc.roomType || doc.name || 'Private Dining').trim(),
    name: (doc.name || '').trim(),
    slug: (doc.slug || '').trim(),
    description: doc.description || null,
    shortDescription: doc.shortDescription || null,
    images: doc.images || [],
    capacityMin: doc.capacityMin ?? 1,
    capacityMax: doc.capacityMax ?? 1,
    roomCount: doc.roomCount ?? 1,
    seatsPerRoom: doc.seatsPerRoom ?? doc.capacityMax ?? 1,
    pricingType: doc.pricingType || 'FIXED',
    price: doc.price ?? 0,
    bookingDurationMinutes: doc.bookingDurationMinutes ?? 60,
    availableTimeSlots: doc.availableTimeSlots || [],
    isActive: doc.isActive ?? true,
    isBookable: doc.isBookable ?? true,
    displayOrder: doc.displayOrder ?? 0,
    amenities: doc.amenities || [],
    createdAt: now,
    updatedAt: now,
  } as DiningRoomDocument;

  const res = await col.insertOne(toInsert as DiningRoomDocument);
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as DiningRoomDocument;
}

export async function updateDiningRoom(id: string, updates: Partial<DiningRoomDocument>) {
  const col = await getDiningRoomsCollection();
  const now = new Date();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...updates, updatedAt: now } });
  return findDiningRoomById(id);
}
