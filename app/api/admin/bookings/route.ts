import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { listBookings } from '@/src/services/dining-service';

export async function GET() {
  const user = await getSessionUser();
  if (!user || (!AuthorizationService.canAccess(user.role, 'bookings.view') && !AuthorizationService.canAccess(user.role, 'payments.view') && !AuthorizationService.canAccess(user.role, 'payments.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bookings = await listBookings();
  return NextResponse.json({ success: true, data: bookings });
}
