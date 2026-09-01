import type { PaymentMethod, PaymentStatus } from '@/src/models/order';

export function normalizePaymentMethod(method: unknown): PaymentMethod {
  if (method === 'ONLINE' || method === 'MANUAL' || method === 'WALLET') {
    return method;
  }
  return 'COD';
}

export function getPaymentMethodLabel(method: PaymentMethod | string | null | undefined) {
  switch (method) {
    case 'ONLINE':
      return 'Online Payment';
    case 'MANUAL':
      return 'Manual Payment';
    case 'WALLET':
      return 'Wallet Payment';
    case 'COD':
    default:
      return 'Cash on Delivery';
  }
}

export function getPaymentMethodInstructions(method: PaymentMethod | string | null | undefined) {
  switch (method) {
    case 'ONLINE':
      return 'You will be redirected to the secure payment gateway after placing the order.';
    case 'MANUAL':
      return 'Please complete the payment and upload proof from your order details page for verification.';
    case 'WALLET':
      return 'Your available wallet balance will be used first and the remaining balance will be settled as pending.';
    case 'COD':
    default:
      return 'Pay in cash when the order arrives.';
  }
}

export function resolveInitialPaymentState(paymentMethod: PaymentMethod | string | null | undefined, totalAmount: number, walletAmountUsed = 0) {
  const normalized = normalizePaymentMethod(paymentMethod);
  const remainingAmount = Math.max(0, totalAmount - walletAmountUsed);

  if (remainingAmount <= 0) {
    return { paymentMethod: normalized as PaymentMethod, paymentStatus: 'PAID' as PaymentStatus, requiresProof: false };
  }

  switch (normalized) {
    case 'MANUAL':
      return { paymentMethod: 'MANUAL' as PaymentMethod, paymentStatus: 'AWAITING_VERIFICATION' as PaymentStatus, requiresProof: true };
    case 'ONLINE':
      return { paymentMethod: 'ONLINE' as PaymentMethod, paymentStatus: 'PENDING' as PaymentStatus, requiresProof: false };
    case 'WALLET':
      return { paymentMethod: 'WALLET' as PaymentMethod, paymentStatus: 'PENDING' as PaymentStatus, requiresProof: false };
    case 'COD':
    default:
      return { paymentMethod: 'COD' as PaymentMethod, paymentStatus: 'PENDING' as PaymentStatus, requiresProof: false };
  }
}
