import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { adjustWalletBalance, listWallets } from '@/src/models/wallet';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'wallet.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const wallets = await listWallets();
  return NextResponse.json({ success: true, data: wallets });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'wallet.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const payload = await request.json();
  const wallet = await adjustWalletBalance(payload.userId, payload.amount, payload.reason || 'Manual adjustment', payload.referenceId || null);
  return NextResponse.json({ success: true, data: wallet });
}
