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

  const adminRoles = ['MAIN_ADMIN', 'ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'];

  if (!adminRoles.includes(user.role)) {
    // Authenticated but not authorized for admin — send to safe customer area
    redirect('/account');
  }

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

  if (!AuthorizationService.canAccess(user.role, permission)) {
    redirect('/login');
  }

  return user;
}
