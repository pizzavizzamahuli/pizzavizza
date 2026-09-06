import { NextResponse } from 'next/server';
import { adminUpdateDiningRoom, adminDeleteDiningRoom, getDiningRoomById } from '@/src/services/dining-service';
import { deleteCloudinaryResource, extractCloudinaryPublicId } from '@/src/utils/cloudinary';
import fs from 'fs';
import path from 'path';
import { getDiningRoomsCollection } from '@/src/models/dining-room';
import { getProductsCollection } from '@/src/models/product';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const found = await getDiningRoomById(id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: found });
  } catch (err) {
    console.error('Get dining room failed', err);
    return NextResponse.json({ error: 'Failed to get dining room' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'bookings.manage', user.permissions)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const { id } = await context.params;
    const updated = await adminUpdateDiningRoom(id, payload);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update dining room';
    console.error('Update dining room failed', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'bookings.manage', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;
    const room = await adminDeleteDiningRoom(id);
    if (!room) return NextResponse.json({ error: 'Dining room not found' }, { status: 404 });

    const roomImages = Array.from(new Set(room.images || []));
    const rooms = await (await getDiningRoomsCollection()).find({}).project({ images: 1 }).toArray();
    const products = await (await getProductsCollection()).find({}).project({ image: 1, images: 1 }).toArray();
    const settings = await getRestaurantSettings();
    const sharedUrls = new Set([
      ...rooms.flatMap((item) => item.images || []),
      ...products.flatMap((item) => [item.image, ...(item.images || [])]),
      settings.logo, settings.menuImage, settings.homeImage,
      ...(settings.homepageImages || []).map((image) => image.imageUrl),
    ].filter((image): image is string => Boolean(image)));
    for (const imageUrl of roomImages) {
      if (sharedUrls.has(imageUrl)) continue;
      if (imageUrl.startsWith('/')) {
        await fs.promises.unlink(path.join(process.cwd(), 'public', imageUrl.replace(/^\//, ''))).catch((error: unknown) => { if ((error as { code?: string })?.code !== 'ENOENT') throw error; });
      } else {
        const publicId = extractCloudinaryPublicId(imageUrl);
        if (publicId) await deleteCloudinaryResource(publicId);
      }
    }
    revalidatePath('/dining');
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Delete dining room failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete dining room' }, { status: 500 });
  }
}
