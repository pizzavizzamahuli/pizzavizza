import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { adminCreateCustomizationGroup, adminListCustomizationGroups } from '@/src/services/menu-service';

export async function GET() {
  try {
    const items = await adminListCustomizationGroups();
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    console.error('List customization groups failed', err);
    return NextResponse.json({ error: 'Failed to list customization groups' }, { status: 500 });
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
    const created = await adminCreateCustomizationGroup(payload);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('Create customization group failed', err);
    return NextResponse.json({ error: 'Failed to create customization group' }, { status: 400 });
  }
}
