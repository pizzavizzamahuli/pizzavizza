import { NextResponse } from 'next/server';
import { findProductById } from '@/src/models/product';
import { adminUpdateProduct } from '@/src/services/menu-service';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'menu.manage')) {
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
