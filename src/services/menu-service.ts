import { z } from 'zod';
import {
  createCategory,
  listCategories,
  updateCategory,
  findCategoryById,
  CategoryDocument,
} from '@/src/models/category';
import {
  createProduct,
  listProducts,
  updateProduct,
  findProductById,
  findProductBySlug,
  ProductDocument,
} from '@/src/models/product';
import {
  createCustomizationGroup,
  updateCustomizationGroup,
  deleteCustomizationGroup,
  findCustomizationGroupById,
  findCustomizationGroupsByIds,
  listCustomizationGroups,
  CustomizationGroupDocument,
} from '@/src/models/customization-group';

export const CategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image: z.string().url().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const ProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  categoryId: z.string().min(1),
  price: z.number().positive(),
  discountPrice: z.number().min(0).optional(),
  image: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  preparationTime: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  customizationGroupIds: z.array(z.string()).optional(),
});

export async function getAllCategories() {
  return listCategories({ isActive: true });
}

export async function adminListCategories() {
  return listCategories();
}

export async function adminCreateCategory(input: unknown) {
  const data = CategorySchema.parse(input);
  return createCategory(data as Partial<CategoryDocument>);
}

export async function adminUpdateCategory(id: string, input: unknown) {
  const data = CategorySchema.partial().parse(input);
  return updateCategory(id, data as Partial<CategoryDocument>);
}

export async function adminListProducts(filter: Record<string, unknown> = {}) {
  return listProducts(filter as Partial<ProductDocument>);
}

async function validateCustomizationGroupIds(ids?: string[]) {
  if (!ids || ids.length === 0) return;
  const groups = await findCustomizationGroupsByIds(ids);
  if (groups.length !== ids.length) {
    throw new Error('One or more customization groups are invalid');
  }
}

export async function adminCreateProduct(input: unknown) {
  const data = ProductSchema.parse(input);
  const found = await findCategoryById(data.categoryId as unknown as string);
  if (!found) throw new Error('Category not found');
  await validateCustomizationGroupIds(data.customizationGroupIds as string[] | undefined);
  return createProduct(data as Partial<ProductDocument>);
}

export async function adminUpdateProduct(id: string, input: unknown) {
  const data = ProductSchema.partial().parse(input);
  if (data.categoryId) {
    const found = await findCategoryById(data.categoryId as unknown as string);
    if (!found) throw new Error('Category not found');
  }
  await validateCustomizationGroupIds(data.customizationGroupIds as string[] | undefined);
  return updateProduct(id, data as Partial<ProductDocument>);
}

export async function adminListCustomizationGroups() {
  return listCustomizationGroups();
}

export async function adminGetCustomizationGroup(id: string) {
  return findCustomizationGroupById(id);
}

export async function adminCreateCustomizationGroup(input: unknown) {
  const data = input as Partial<CustomizationGroupDocument>;
  return createCustomizationGroup(data);
}

export async function adminUpdateCustomizationGroup(id: string, input: unknown) {
  const data = input as Partial<CustomizationGroupDocument>;
  return updateCustomizationGroup(id, data);
}

export async function adminDeleteCustomizationGroup(id: string) {
  return deleteCustomizationGroup(id);
}

export async function getProductBySlug(slug: string) {
  return (await findProductById(slug)) || findProductBySlug(slug);
}

export async function getProductsForCustomer() {
  return listProducts({ isAvailable: true });
}
