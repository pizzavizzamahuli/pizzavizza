const labels: Record<string, string> = {
  ACTIVE: 'Active',
  AVAILABLE: 'Available',
  AWAITING_VERIFICATION: 'Payment Verification Pending',
  BUSY: 'Busy',
  CANCELLED: 'Cancelled',
  CASH_ON_DELIVERY: 'Cash on Delivery',
  COD: 'Cash on Delivery',
  COMPLETED: 'Completed',
  CONFIRMED: 'Confirmed',
  CUSTOMER: 'Customer',
  DELIVERED: 'Delivered',
  DELIVERY: 'Delivery',
  DELIVERY_STAFF: 'Delivery Staff',
  DISABLED: 'Disabled',
  EXPIRED: 'Expired',
  FAILED: 'Payment Failed',
  KITCHEN_STAFF: 'Kitchen Staff',
  ADMIN: 'Admin',
  MAIN_ADMIN: 'Main Admin',
  MANAGER: 'Manager',
  MANUAL: 'Manual Payment',
  NO_SHOW: 'No-show',
  NOT_REQUIRED: 'Not Required',
  OFFLINE: 'Offline',
  ON_DELIVERY: 'On Delivery',
  ONLINE: 'Online Payment',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  PAID: 'Payment Verified',
  PAYMENT_PENDING: 'Payment Pending',
  PAYMENT_VERIFICATION: 'Payment Verification Pending',
  PENDING: 'Pending',
  PICKED_UP: 'Picked Up',
  PICKUP: 'Pickup',
  PREPARING: 'Preparing',
  READY: 'Ready',
  REJECTED: 'Rejected',
  REFUNDED: 'Payment Refunded',
  SUSPENDED: 'Suspended',
  SUSPICIOUS: 'Payment Under Review',
  STORE_VISITED: 'Store Visit',
  WALLET: 'Wallet Payment',
};

export function displayLabel(value: string | null | undefined) {
  if (!value) return 'Not specified';
  return labels[value] || value.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function orderStatusLabel(value: string | null | undefined) {
  if (value === 'PENDING') return 'Order Placed';
  return displayLabel(value);
}

export function paymentStatusLabel(value: string | null | undefined) {
  if (value === 'PENDING') return 'Payment Pending';
  return displayLabel(value);
}

export function bookingStatusLabel(value: string | null | undefined) {
  return displayLabel(value);
}
