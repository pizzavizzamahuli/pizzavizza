import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export interface AddressDocument {
  _id?: ObjectId;
  id?: string;
  userId: string;
  label?: string | null;
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ADDRESSES_COLLECTION = 'addresses';

let addressesCollectionPromise: Promise<Collection<AddressDocument>> | null = null;

export async function getAddressesCollection() {
  if (addressesCollectionPromise) return addressesCollectionPromise;

  addressesCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<AddressDocument>(ADDRESSES_COLLECTION);
    await collection.createIndex({ userId: 1 });
    return collection;
  })();

  return addressesCollectionPromise;
}

export async function listAddressesForUser(userId: string) {
  const col = await getAddressesCollection();
  return col.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).toArray();
}

export async function findAddressById(id: string) {
  const col = await getAddressesCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function createAddress(doc: Partial<AddressDocument>) {
  const col = await getAddressesCollection();
  const now = new Date();
  const toInsert: AddressDocument = {
    userId: doc.userId || '',
    label: doc.label || null,
    fullName: (doc.fullName || '').trim(),
    mobile: (doc.mobile || '').trim(),
    addressLine1: (doc.addressLine1 || '').trim(),
    addressLine2: doc.addressLine2 || null,
    landmark: doc.landmark || null,
    city: (doc.city || '').trim(),
    state: (doc.state || '').trim(),
    postalCode: (doc.postalCode || '').trim(),
    country: (doc.country || '').trim(),
    latitude: doc.latitude ?? null,
    longitude: doc.longitude ?? null,
    googleMapsUrl: doc.googleMapsUrl || null,
    isDefault: doc.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
  } as AddressDocument;

  const res = await col.insertOne(toInsert as AddressDocument);
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as AddressDocument;
}

export async function updateAddress(id: string, updates: Partial<AddressDocument>) {
  const col = await getAddressesCollection();
  const now = new Date();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...updates, updatedAt: now } });
  return findAddressById(id);
}

export async function deleteAddress(id: string) {
  const col = await getAddressesCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
  return true;
}
