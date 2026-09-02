import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { getWalletBalance } from '@/src/models/wallet';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const balance = await getWalletBalance(user._id!.toHexString());
  return NextResponse.json({ success: true, data: { balance } });
}
