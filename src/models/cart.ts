import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export interface CartItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface CartItem {
  productId: string;
  itemKey?: string;
  name?: string | null; // snapshot optional
  image?: string | null; // snapshot optional
  unitPrice?: number | null; // optional convenience, server will re-calc on checkout
  quantity: number;
  selectedOptions?: CartItemOption[];
}

export interface CartDocument {
  _id?: ObjectId;
  id?: string;
  userId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CARTS_COLLECTION = 'carts';

let cartsCollectionPromise: Promise<Collection<CartDocument>> | null = null;

export async function getCartsCollection() {
  if (cartsCollectionPromise) return cartsCollectionPromise;

  cartsCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<CartDocument>(CARTS_COLLECTION);
    await collection.createIndex({ userId: 1 }, { unique: true });
    return collection;
  })();

  return cartsCollectionPromise;
}

export async function findCartByUserId(userId: string, session?: ClientSession) {
  const col = await getCartsCollection();
  return col.findOne({ userId }, { session });
}

export async function createOrReplaceCart(userId: string, items: CartItem[], session?: ClientSession) {
  const col = await getCartsCollection();
  const now = new Date();
  const doc: CartDocument = { userId, items, createdAt: now, updatedAt: now } as CartDocument;
  await col.updateOne({ userId }, { $set: doc }, { upsert: true, session });
  return findCartByUserId(userId, session);
}

export async function updateCartItems(userId: string, items: CartItem[], session?: ClientSession) {
  const col = await getCartsCollection();
  const now = new Date();
  await col.updateOne({ userId }, { $set: { items, updatedAt: now } }, { upsert: true, session });
  return findCartByUserId(userId, session);
}

export async function clearCart(userId: string, session?: ClientSession) {
  const col = await getCartsCollection();
  await col.deleteOne({ userId }, { session });
  return true;
}
