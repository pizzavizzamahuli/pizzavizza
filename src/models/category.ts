import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export interface CategoryDocument {
  _id?: ObjectId;
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CATEGORIES_COLLECTION = 'categories';

let categoriesCollectionPromise: Promise<Collection<CategoryDocument>> | null = null;

export async function getCategoriesCollection() {
  if (categoriesCollectionPromise) return categoriesCollectionPromise;

  categoriesCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<CategoryDocument>(CATEGORIES_COLLECTION);

    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.createIndex({ name: 1 }, { unique: true });

    return collection;
  })();

  return categoriesCollectionPromise;
}

export async function findCategoryBySlug(slug: string) {
  const col = await getCategoriesCollection();
  return col.findOne({ slug });
}

export async function findCategoryById(id: string) {
  const col = await getCategoriesCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function listCategories(filter: Partial<CategoryDocument> = {}) {
  const col = await getCategoriesCollection();
  return col.find(filter).sort({ displayOrder: 1, name: 1 }).toArray();
}

export async function createCategory(doc: Partial<CategoryDocument>) {
  const col = await getCategoriesCollection();
  const now = new Date();
  const toInsert: CategoryDocument = {
    name: (doc.name || '').trim(),
    slug: (doc.slug || '').trim(),
    description: doc.description || null,
    image: doc.image || null,
    displayOrder: doc.displayOrder ?? 0,
    isActive: doc.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  } as CategoryDocument;

  const res = await col.insertOne(toInsert as CategoryDocument);
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as CategoryDocument;
}

export async function updateCategory(id: string, updates: Partial<CategoryDocument>) {
  const col = await getCategoriesCollection();
  const now = new Date();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...updates, updatedAt: now } });
  return findCategoryById(id);
}
