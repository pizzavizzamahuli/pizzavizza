import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';
import { randomUUID } from 'crypto';

export interface CustomizationOption {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  isActive?: boolean;
  imageUrl?: string | null;
  displayOrder?: number;
}

export interface CustomizationGroupDocument {
  _id?: ObjectId;
  id?: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  required?: boolean;
  minSelections?: number | null;
  maxSelections?: number | null;
  displayOrder?: number;
  options: CustomizationOption[];
  createdAt: Date;
  updatedAt: Date;
}

const CUSTOMIZATION_GROUPS_COLLECTION = 'customization_groups';

let customizationGroupsCollectionPromise: Promise<Collection<CustomizationGroupDocument>> | null = null;

export async function getCustomizationGroupsCollection() {
  if (customizationGroupsCollectionPromise) return customizationGroupsCollectionPromise;

  customizationGroupsCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<CustomizationGroupDocument>(CUSTOMIZATION_GROUPS_COLLECTION);

    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ 'options.id': 1 });
    await collection.createIndex({ isActive: 1 });

    return collection;
  })();

  return customizationGroupsCollectionPromise;
}

function normalizeOption(option: Partial<CustomizationOption>) {
  return {
    id: option.id?.trim() || randomUUID(),
    name: (option.name || '').trim(),
    description: option.description ?? null,
    price: Number(option.price ?? 0),
    isActive: option.isActive ?? true,
    imageUrl: option.imageUrl ?? null,
    displayOrder: option.displayOrder ?? 0,
  } as CustomizationOption;
}

function normalizeOptions(options: Partial<CustomizationOption>[] = []) {
  return options
    .filter((option) => option && (option.name || option.id))
    .map((option) => normalizeOption(option));
}

export async function createCustomizationGroup(doc: Partial<CustomizationGroupDocument>) {
  const col = await getCustomizationGroupsCollection();
  const now = new Date();
  const toInsert: CustomizationGroupDocument = {
    id: doc.id?.trim() || randomUUID(),
    name: (doc.name || '').trim(),
    description: doc.description ?? null,
    isActive: doc.isActive ?? true,
    required: doc.required ?? false,
    minSelections: doc.minSelections ?? null,
    maxSelections: doc.maxSelections ?? null,
    displayOrder: doc.displayOrder ?? 0,
    options: normalizeOptions(doc.options || []),
    createdAt: now,
    updatedAt: now,
  } as CustomizationGroupDocument;

  const res = await col.insertOne(toInsert as CustomizationGroupDocument);
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as CustomizationGroupDocument;
}

export async function updateCustomizationGroup(id: string, updates: Partial<CustomizationGroupDocument>) {
  const col = await getCustomizationGroupsCollection();
  const existing = await findCustomizationGroupById(id);
  if (!existing) throw new Error('Customization group not found');

  const updated: CustomizationGroupDocument = {
    ...existing,
    ...updates,
    name: updates.name !== undefined ? updates.name.trim() : existing.name,
    description: updates.description ?? existing.description,
    isActive: updates.isActive ?? existing.isActive,
    required: updates.required ?? existing.required,
    minSelections: updates.minSelections ?? existing.minSelections,
    maxSelections: updates.maxSelections ?? existing.maxSelections,
    displayOrder: updates.displayOrder ?? existing.displayOrder,
    options: updates.options ? normalizeOptions(updates.options) : existing.options,
    updatedAt: new Date(),
  };

  const setDoc = {
    name: updated.name,
    description: updated.description,
    isActive: updated.isActive,
    required: updated.required,
    minSelections: updated.minSelections,
    maxSelections: updated.maxSelections,
    displayOrder: updated.displayOrder,
    options: updated.options,
    updatedAt: updated.updatedAt,
  };
  await col.updateOne({ _id: existing._id! }, { $set: setDoc });
  return findCustomizationGroupById(id);
}

export async function findCustomizationGroupById(id: string) {
  const col = await getCustomizationGroupsCollection();
  return col.findOne({ id });
}

export async function findCustomizationGroupsByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  const col = await getCustomizationGroupsCollection();
  return col
    .find({ id: { $in: ids } })
    .sort({ displayOrder: 1, name: 1 })
    .toArray();
}

export async function listCustomizationGroups(filter: Partial<CustomizationGroupDocument> = {}) {
  const col = await getCustomizationGroupsCollection();
  return col.find(filter).sort({ displayOrder: 1, name: 1 }).toArray();
}

export async function deleteCustomizationGroup(id: string) {
  const col = await getCustomizationGroupsCollection();
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function findCustomizationOptionById(optionId: string) {
  const col = await getCustomizationGroupsCollection();
  return col.findOne({ 'options.id': optionId }, { projection: { 'options.$': 1, name: 1, id: 1, required: 1, minSelections: 1, maxSelections: 1, isActive: 1, displayOrder: 1 } });
}

export async function findCustomizationOptionsByIds(optionIds: string[]) {
  if (!optionIds || optionIds.length === 0) return [];
  const col = await getCustomizationGroupsCollection();
  return col.find({ 'options.id': { $in: optionIds } }).toArray();
}
