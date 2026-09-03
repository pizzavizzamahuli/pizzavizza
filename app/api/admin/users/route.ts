import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { createUser, findUserByEmail, setPasswordResetForUser, getUserById, hashPassword, isValidMobile, ensureUserCode } from '@/src/services/user-service';
import { UserRole } from '@/src/types';
import type { UserDocument } from '@/src/models/user';
import { env } from '@/src/config/env';
import { sendPasswordResetEmail } from '@/src/services/email-service';
import { randomInt } from 'crypto';
import { recordAudit } from '@/src/models/audit-log';

export async function GET(request: Request) {
  try {
    if (!env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB connection requires MONGODB_URI in .env.local.' }, { status: 503 });
    }

    const user = await getSessionUser();
    if (!user || !AuthorizationService.canAccess(user.role, 'settings.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');
    const userCode = searchParams.get('userCode')?.trim();
    const allowedRoles: UserRole[] = ['MAIN_ADMIN', 'ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF', 'CUSTOMER'];
    const isMainAdmin = user.role === 'MAIN_ADMIN';
    const visibleRoles: UserRole[] = isMainAdmin ? allowedRoles : allowedRoles.filter((role) => role !== 'MAIN_ADMIN');
    const selectedRoles: UserRole[] = roleFilter && visibleRoles.includes(roleFilter as UserRole)
      ? [roleFilter as UserRole]
      : visibleRoles;

    const collection = await (await import('@/src/models/user')).getUsersCollection();
    const users = await collection
      .find({ role: { $in: selectedRoles }, ...(userCode ? { userCode } : {}) })
      .project({ passwordHash: 0, passwordReset: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: await Promise.all(users.map(async (item) => ({
        id: item._id?.toHexString() || item.id,
        userCode: await ensureUserCode(item as UserDocument),
        name: item.name,
        email: item.email,
        mobile: item.mobile || null,
        role: item.role,
        accountStatus: item.accountStatus,
        protected: isMainAdmin ? item.protected ?? false : false,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      }))),
      meta: { isMainAdmin, availableRoles: isMainAdmin ? ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'] : ['KITCHEN_STAFF', 'DELIVERY_STAFF'] },
    });
  } catch (error) {
    console.error('List admin users failed', error);
    return NextResponse.json({ error: 'Unable to list users.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB connection requires MONGODB_URI in .env.local.' }, { status: 503 });
    }

    const user = await getSessionUser();
    if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const role = String(body?.role || '').trim();
    const mobile = String(body?.mobile || '').trim();
    const password = String(body?.password || '').trim();

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email and role are required.' }, { status: 400 });
    }

    const allowedCreateRoles = user.role === 'MAIN_ADMIN' ? ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'] : ['KITCHEN_STAFF', 'DELIVERY_STAFF'];
    if (!allowedCreateRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }
    if (mobile && !isValidMobile(mobile)) return NextResponse.json({ error: 'Invalid mobile number.' }, { status: 400 });
    if (password && password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
    }

    const temporaryPassword = password || randomInt(10 ** 8, 10 ** 9 - 1).toString();
    const staffUser = await createUser({
      name,
      email,
      mobile: mobile || null,
      password: temporaryPassword,
      role: role as UserRole,
      accountStatus: 'ACTIVE',
      protected: false,
    });

    if (!password) {
      const code = randomInt(100000, 999999).toString();
      const codeHash = await hashPassword(code);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 15);
      await setPasswordResetForUser(staffUser.id as string, codeHash, expiresAt);
      await sendPasswordResetEmail(staffUser.email, staffUser.name, code);
    }

    await recordAudit({
      type: 'ADMIN_USER_CREATED',
      performedBy: user._id?.toHexString() || user.email || null,
      newValue: {
        id: staffUser.id,
        name: staffUser.name,
        email: staffUser.email,
        role: staffUser.role,
        accountStatus: staffUser.accountStatus,
      },
      timestamp: new Date(),
    });

    const created = await getUserById(staffUser.id as string);
    return NextResponse.json({
      success: true,
      data: {
        id: created?._id?.toHexString() || created?.id,
        userCode: created ? await ensureUserCode(created) : null,
        name: created?.name,
        email: created?.email,
        role: created?.role,
        accountStatus: created?.accountStatus,
      },
    });
  } catch (error) {
    console.error('Create admin user failed', error);
    return NextResponse.json({ error: 'Unable to create staff account.' }, { status: 500 });
  }
}
