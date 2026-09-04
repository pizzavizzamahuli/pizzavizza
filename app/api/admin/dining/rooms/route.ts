import { NextResponse } from 'next/server';
import { adminListDiningRooms, adminCreateDiningRoom } from '@/src/services/dining-service';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';

export async function GET() {
  try {
    const items = await adminListDiningRooms();
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    console.error('List dining rooms failed', err);
    return NextResponse.json({ error: 'Failed to list dining rooms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'bookings.manage', user.permissions)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const created = await adminCreateDiningRoom(payload);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create dining room';
    console.error('Create dining room failed', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
