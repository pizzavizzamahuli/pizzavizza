import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { adjustWalletBalance, listWallets } from '@/src/models/wallet';
import { findUserByUserCode } from '@/src/models/user';
import { ensureUserCode, getUserById } from '@/src/services/user-service';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'wallet.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const wallets = await listWallets();
  const data = await Promise.all(wallets.map(async (wallet) => {
    const user = await getUserById(String(wallet.userId));
    return { ...wallet, userCode: user ? await ensureUserCode(user) : null, userName: user?.name || null };
  }));
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'wallet.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const payload = await request.json();
  if (typeof payload.userId !== 'string' || !payload.userId.trim()) return NextResponse.json({ error: 'A valid user ID is required' }, { status: 400 });
  const requestedUserId = payload.userId.trim();
  const targetUser = requestedUserId.match(/^[0-9a-fA-F]{24}$/) ? await getUserById(requestedUserId) : await findUserByUserCode(requestedUserId);
  if (!targetUser?._id) return NextResponse.json({ error: 'User not found. Enter the consumer user ID.' }, { status: 404 });
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount === 0) return NextResponse.json({ error: 'Amount must be a non-zero number' }, { status: 400 });
  const wallet = await adjustWalletBalance(targetUser._id.toHexString(), amount, payload.reason || 'Manual adjustment', payload.referenceId || null);
  return NextResponse.json({ success: true, data: wallet });
}
