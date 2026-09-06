import { NextResponse } from 'next/server';
import { findProductById, getProductsCollection } from '@/src/models/product';
import { adminUpdateProduct } from '@/src/services/menu-service';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { deleteCloudinaryResource, extractCloudinaryPublicId } from '@/src/utils/cloudinary';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'menu.manage', user.permissions)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const { id } = await context.params;
    const updated = await adminUpdateProduct(id, payload as unknown);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Update product failed', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 400 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const found = await findProductById(id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: found });
  } catch (err) {
    console.error('Get product failed', err);
    return NextResponse.json({ error: 'Failed to get product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'menu.manage', user.permissions)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const payload = await request.json();
    const requestedUrl = typeof payload.imageUrl === 'string' ? payload.imageUrl : '';
    if (!requestedUrl) return NextResponse.json({ error: 'Missing image reference' }, { status: 400 });

    const product = await findProductById(id);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    const currentImages = Array.from(new Set([product.image, ...(product.images || [])].filter((image): image is string => Boolean(image))));
    if (!currentImages.includes(requestedUrl)) return NextResponse.json({ error: 'Image not found on this product' }, { status: 404 });

    const remainingImages = currentImages.filter((image) => image !== requestedUrl);
    const collection = await getProductsCollection();
    const productFilter = product._id ? { _id: product._id } : { id: product.id };
    await collection.updateOne(productFilter, {
      $set: { image: remainingImages[0] || null, images: remainingImages.slice(1), updatedAt: new Date() },
    });

    const otherProductReference = await collection.findOne({
      ...(product._id ? { _id: { $ne: product._id } } : { id: { $ne: product.id } }),
      $or: [{ image: requestedUrl }, { images: requestedUrl }],
    });
    const settings = await getRestaurantSettings();
    const settingsReference = [settings.logo, settings.menuImage, settings.homeImage, ...(settings.homepageImages || []).map((item) => item.imageUrl)].includes(requestedUrl);
    if (!otherProductReference && !settingsReference) {
      if (requestedUrl.startsWith('/')) {
        const localPath = path.join(process.cwd(), 'public', requestedUrl.replace(/^\//, ''));
        await fs.promises.unlink(localPath).catch((error: unknown) => {
          if ((error as { code?: string })?.code !== 'ENOENT') throw error;
        });
      } else {
        const publicId = extractCloudinaryPublicId(requestedUrl);
        if (publicId) await deleteCloudinaryResource(publicId);
      }
    }

    const updated = await findProductById(id);
    revalidatePath('/');
    revalidatePath('/menu');
    revalidatePath(`/menu/${product.slug}`);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Delete product image failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete product image' }, { status: 500 });
  }
}
