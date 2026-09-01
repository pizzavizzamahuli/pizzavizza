import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getUserById, updateUser } from '@/src/services/user-service';
import { recordAudit } from '@/src/models/audit-log';
import { UserRole, AccountStatus } from '@/src/types';

const editableRoles: UserRole[] = ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'];
const editableStatuses: AccountStatus[] = ['ACTIVE', 'DISABLED', 'SUSPENDED'];

export async function PATCH(request: Request, context: unknown) {
  const { params } = context as { params: { id: string } };
  try {
    const user = await getSessionUser();
    if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetId = params.id;
    const targetUser = await getUserById(targetId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    if (targetUser.role === 'MAIN_ADMIN' || targetUser.protected) {
      return NextResponse.json({ error: 'Main admin account cannot be modified.' }, { status: 403 });
    }

    const body = await request.json();
    const role = body?.role ? String(body.role).trim() : undefined;
    const accountStatus = body?.accountStatus ? String(body.accountStatus).trim() : undefined;

    const updates: Partial<Record<string, unknown>> = {};
    const oldValue: Record<string, unknown> = {
      id: targetUser._id?.toHexString() || targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      accountStatus: targetUser.accountStatus,
    };
    const newValue: Record<string, unknown> = { ...oldValue };

    if (role !== undefined) {
      if (!editableRoles.includes(role as UserRole)) {
        return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
      }
      updates.role = role as UserRole;
      newValue.role = role;
    }

    if (accountStatus !== undefined) {
      if (!editableStatuses.includes(accountStatus as AccountStatus)) {
        return NextResponse.json({ error: 'Invalid account status.' }, { status: 400 });
      }
      updates.accountStatus = accountStatus as AccountStatus;
      newValue.accountStatus = accountStatus;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No changes were provided.' }, { status: 400 });
    }

    await updateUser(targetId, updates);
    await recordAudit({
      type: 'ADMIN_USER_UPDATED',
      performedBy: user._id?.toHexString() || user.email || null,
      oldValue,
      newValue,
      timestamp: new Date(),
    });

    const updatedUser = await getUserById(targetId);
    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser?._id?.toHexString() || updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        role: updatedUser?.role,
        accountStatus: updatedUser?.accountStatus,
      },
    });
  } catch (error) {
    console.error('Update user account failed', error);
    return NextResponse.json({ error: 'Unable to update user account.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: unknown) {
  const { params } = context as { params: { id: string } };
  try {
    const user = await getSessionUser();
    if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetId = params.id;
    const targetUser = await getUserById(targetId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    if (targetUser.role === 'MAIN_ADMIN' || targetUser.protected) {
      return NextResponse.json({ error: 'Main admin account cannot be deleted.' }, { status: 403 });
    }

    const collection = await (await import('@/src/models/user')).getUsersCollection();
    await collection.deleteOne({ _id: targetUser._id });
    await recordAudit({
      type: 'ADMIN_USER_DELETED',
      performedBy: user._id?.toHexString() || user.email || null,
      oldValue: {
        id: targetUser._id?.toHexString() || targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Delete user account failed', error);
    return NextResponse.json({ error: 'Unable to delete user account.' }, { status: 500 });
  }
}
