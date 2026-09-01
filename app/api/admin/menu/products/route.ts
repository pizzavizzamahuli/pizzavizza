import { NextResponse } from 'next/server';
import { adminListProducts, adminCreateProduct } from '@/src/services/menu-service';
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
    if (!AuthorizationService.canAccess(user.role, 'menu.manage')) {
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
