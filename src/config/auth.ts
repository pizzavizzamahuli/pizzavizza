export const authRoles = {
  customer: 'CUSTOMER',
  mainAdmin: 'MAIN_ADMIN',
  admin: 'ADMIN',
  manager: 'MANAGER',
  kitchenStaff: 'KITCHEN_STAFF',
  deliveryStaff: 'DELIVERY_STAFF',
} as const;

export const protectedRoles = {
  mainAdmin: 'MAIN_ADMIN',
};
