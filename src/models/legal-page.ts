import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export type LegalPageSlug = 'privacy-policy' | 'terms-and-conditions' | 'refund-cancellation-policy' | 'delivery-policy';

export interface LegalPageDocument {
  _id?: ObjectId;
  id?: string;
  slug: LegalPageSlug;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LEGAL_PAGES_COLLECTION = 'legal_pages';

const defaultLegalPages: Array<Pick<LegalPageDocument, 'slug' | 'title' | 'content' | 'isPublished'>> = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content: 'Pizza Vizza respects customer privacy. Update this policy from Admin Settings before publishing.',
    isPublished: true,
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    content: 'These terms apply to Pizza Vizza orders, pickup, delivery, payments, and dining bookings. Update this page from Admin Settings.',
    isPublished: true,
  },
  {
    slug: 'refund-cancellation-policy',
    title: 'Refund & Cancellation Policy',
    content: 'Refunds and cancellations are handled by Pizza Vizza according to order status and payment method. Update this policy from Admin Settings.',
    isPublished: true,
  },
  {
    slug: 'delivery-policy',
    title: 'Delivery Policy',
    content: 'Delivery availability depends on restaurant settings, delivery radius, customer location, and operating conditions. Update this policy from Admin Settings.',
    isPublished: true,
  },
];

let legalPagesCollectionPromise: Promise<Collection<LegalPageDocument>> | null = null;

export async function getLegalPagesCollection() {
  if (legalPagesCollectionPromise) return legalPagesCollectionPromise;

  legalPagesCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<LegalPageDocument>(LEGAL_PAGES_COLLECTION);
    await collection.createIndex({ slug: 1 }, { unique: true });
    return collection;
  })();

  return legalPagesCollectionPromise;
}

async function ensureDefaultLegalPages() {
  const col = await getLegalPagesCollection();
  const now = new Date();
  await Promise.all(defaultLegalPages.map((page) =>
    col.updateOne(
      { slug: page.slug },
      { $setOnInsert: { ...page, createdAt: now, updatedAt: now } },
      { upsert: true },
    ),
  ));
}

export async function listLegalPages() {
  await ensureDefaultLegalPages();
  const col = await getLegalPagesCollection();
  return col.find({}).sort({ slug: 1 }).toArray();
}

export async function findLegalPageBySlug(slug: string) {
  await ensureDefaultLegalPages();
  const col = await getLegalPagesCollection();
  return col.findOne({ slug: slug as LegalPageSlug });
}

export async function updateLegalPage(slug: string, updates: Pick<LegalPageDocument, 'title' | 'content' | 'isPublished'>) {
  await ensureDefaultLegalPages();
  const col = await getLegalPagesCollection();
  const now = new Date();
  await col.updateOne(
    { slug: slug as LegalPageSlug },
    { $set: { title: updates.title, content: updates.content, isPublished: updates.isPublished, updatedAt: now } },
  );
  return col.findOne({ slug: slug as LegalPageSlug });
}
