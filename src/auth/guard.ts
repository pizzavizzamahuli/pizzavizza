import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { UserRole } from '@/src/types';
import { AuthorizationService, PermissionName } from '@/src/config/permissions';

export async function requireAuth() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  if (user.temporaryAccess?.enabled && user.temporaryAccess.forcePasswordChange) {
    redirect('/account/change-password');
  }

  return user;
}

export async function requireAdminAccess() {
  const user = await requireAuth();

  const adminRoles = ['MAIN_ADMIN', 'ADMIN'];

  if (!adminRoles.includes(user.role)) {
    redirect(user.role === 'MANAGER' ? '/manager' : user.role === 'KITCHEN_STAFF' ? '/kitchen' : user.role === 'DELIVERY_STAFF' ? '/delivery' : '/account');
  }

  return user;
}

  export async function requireAdminPanelAccess() {
    const user = await requireAuth();
    if (!['MAIN_ADMIN', 'ADMIN'].includes(user.role)) redirect(user.role === 'MANAGER' ? '/manager' : user.role === 'KITCHEN_STAFF' ? '/kitchen' : user.role === 'DELIVERY_STAFF' ? '/delivery' : '/account');
    return user;
  }

export async function requireRoleDashboard() {
  const user = await requireAuth();
  if (!['MAIN_ADMIN', 'ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'].includes(user.role)) redirect('/account');
  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth();

  if (user.role !== role) {
    redirect('/login');
  }

  return user;
}

export async function requirePermission(permission: PermissionName) {
  const user = await requireAuth();

  if (!AuthorizationService.canAccess(user.role, permission, user.permissions)) {
    redirect('/login');
  }

  return user;
}
