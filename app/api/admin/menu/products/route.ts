import { NextResponse } from 'next/server';
import { adminListProducts, adminCreateProduct } from '@/src/services/menu-service';
import { deleteProduct, getProductsCollection } from '@/src/models/product';
import { deleteCloudinaryResource, extractCloudinaryPublicId } from '@/src/utils/cloudinary';
import fs from 'fs';
import path from 'path';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';

export async function GET() {
  try {
    const items = await adminListProducts();
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    console.error('List products failed', err);
    return NextResponse.json({ error: 'Failed to list products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'menu.manage', user.permissions)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const created = await adminCreateProduct(payload);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('Create product failed', err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'menu.manage', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await request.json() as { id?: string };
    if (!id) return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    const product = await deleteProduct(id);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const imageUrls = Array.from(new Set([product.image, ...(product.images || [])].filter((image): image is string => Boolean(image))));
    const products = await (await getProductsCollection()).find({}).project({ image: 1, images: 1 }).toArray();
    const settings = await getRestaurantSettings();
    const sharedUrls = new Set(products.flatMap((item) => [item.image, ...(item.images || [])]).filter((image): image is string => Boolean(image)));
    [settings.logo, settings.menuImage, settings.homeImage, ...(settings.homepageImages || []).map((image) => image.imageUrl)].filter((image): image is string => Boolean(image)).forEach((image) => sharedUrls.add(image));
    for (const imageUrl of imageUrls) {
      if (sharedUrls.has(imageUrl)) continue;
      if (imageUrl.startsWith('/')) {
        await fs.promises.unlink(path.join(process.cwd(), 'public', imageUrl.replace(/^\//, ''))).catch((error: unknown) => { if ((error as { code?: string })?.code !== 'ENOENT') throw error; });
      } else {
        const publicId = extractCloudinaryPublicId(imageUrl);
        if (publicId) await deleteCloudinaryResource(publicId);
      }
    }
    revalidatePath('/');
    revalidatePath('/menu');
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Delete product failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete product' }, { status: 500 });
  }
}
