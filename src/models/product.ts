import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export interface ProductDocument {
  _id?: ObjectId;
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  categoryId: string;
  price: number;
  discountPrice?: number | null;
  image?: string | null;
  images?: string[];
  customizationGroupIds?: string[];
  isAvailable?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  preparationTime?: number | null; // minutes
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PRODUCTS_COLLECTION = 'products';

let productsCollectionPromise: Promise<Collection<ProductDocument>> | null = null;

export async function getProductsCollection() {
  if (productsCollectionPromise) return productsCollectionPromise;

  productsCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<ProductDocument>(PRODUCTS_COLLECTION);

    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.createIndex({ categoryId: 1 });
    await collection.createIndex({ isFeatured: 1 });

    return collection;
  })();

  return productsCollectionPromise;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function findProductBySlug(slug?: string | null) {
  const col = await getProductsCollection();
  if (!slug) return null;
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) return null;

  return col.findOne({
    slug: { $regex: `^${escapeRegExp(trimmedSlug)}$`, $options: 'i' },
  });
}

export async function findProductById(id: string) {
  const col = await getProductsCollection();
  if (!id) return null;
  // Try by ObjectId first
  try {
    const byOid = await col.findOne({ _id: new ObjectId(id) });
    if (byOid) return byOid;
  } catch {
    // ignore invalid ObjectId format
  }
  // Fallback to string id field
  const byIdField = await col.findOne({ id });
  if (byIdField) return byIdField;
  // Final fallback: try slug match
  return findProductBySlug(id);
}

export async function listProducts(filter: Partial<ProductDocument> = {}) {
  const col = await getProductsCollection();
  return col.find(filter).sort({ displayOrder: 1, name: 1 }).toArray();
}

export async function createProduct(doc: Partial<ProductDocument>) {
  const col = await getProductsCollection();
  const now = new Date();
  const toInsert: ProductDocument = {
    name: (doc.name || '').trim(),
    slug: (doc.slug || '').trim(),
    description: doc.description || null,
    shortDescription: doc.shortDescription || null,
    categoryId: doc.categoryId || '',
    price: doc.price ?? 0,
    discountPrice: doc.discountPrice ?? null,
    image: doc.image || null,
    images: doc.images || [],
    customizationGroupIds: doc.customizationGroupIds || [],
    isAvailable: doc.isAvailable ?? true,
    isFeatured: doc.isFeatured ?? false,
    displayOrder: doc.displayOrder ?? 0,
    preparationTime: doc.preparationTime ?? null,
    tags: doc.tags || [],
    createdAt: now,
    updatedAt: now,
  } as ProductDocument;

  const res = await col.insertOne(toInsert as ProductDocument);
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as ProductDocument;
}

export async function updateProduct(id: string, updates: Partial<ProductDocument>) {
  const col = await getProductsCollection();
  const now = new Date();
  const updatePayload = { ...updates, updatedAt: now } as Partial<ProductDocument>;
  if (updates.customizationGroupIds === undefined) {
    delete (updatePayload as Partial<ProductDocument>).customizationGroupIds;
  }
  await col.updateOne({ _id: new ObjectId(id) }, { $set: updatePayload });
  return findProductById(id);
}
