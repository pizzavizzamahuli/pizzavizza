export const permissionDefinitions = {
  orders: ['orders.view', 'orders.manage'],
  customers: ['customers.view', 'customers.manage'],
  menu: ['menu.view', 'menu.manage'],
  categories: ['categories.view', 'categories.manage'],
  products: ['products.view', 'products.manage'],
  payments: ['payments.view', 'payments.manage'],
  coupons: ['coupons.view', 'coupons.manage'],
  wallet: ['wallet.view', 'wallet.manage'],
  referrals: ['referrals.view', 'referrals.manage'],
  telegram: ['telegram.viewOrders', 'telegram.manageOrders', 'telegram.viewBookings', 'telegram.manageBookings', 'telegram.viewPayments', 'telegram.verifyPayments', 'telegram.manageDelivery'],
  bookings: ['bookings.view', 'bookings.manage'],
  delivery: ['delivery.view', 'delivery.manage'],
  admins: ['admins.view', 'admins.manage'],
  settings: ['settings.view', 'settings.manage'],
  kitchen: ['kitchen.view', 'kitchen.manage'],
} as const;

export type PermissionName = (typeof permissionDefinitions)[keyof typeof permissionDefinitions][number];

export class AuthorizationService {
  static canAccess(userRole: string, permission: PermissionName, assignedPermissions?: string[]) {
    if (userRole === 'MAIN_ADMIN') {
      return true;
    }

    if (assignedPermissions?.length) return assignedPermissions.includes(permission);

    // Define role-based permission mapping
    const rolePermissions: Record<string, Array<string>> = {
      ADMIN: ['orders', 'customers', 'menu', 'categories', 'products', 'coupons', 'wallet', 'referrals', 'delivery', 'bookings', 'settings', 'telegram', 'kitchen'],
      // Add telegram to admin privileges if desired; granular control is enforced via permission checks.
      ADMIN_TELEGRAM: ['telegram'],
      MANAGER: ['orders', 'bookings', 'delivery', 'kitchen', 'customers'],
      KITCHEN_STAFF: ['kitchen'],
      DELIVERY_STAFF: ['delivery'],
    };

    const allowedPrefixes = rolePermissions[userRole] || [];
    for (const prefix of allowedPrefixes) {
      if (permission === prefix + '.view' || permission === prefix + '.manage' || permission.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }
}

export const mainAdminProtection = {
  protected: true,
  roles: ['MAIN_ADMIN'] as const,
};
