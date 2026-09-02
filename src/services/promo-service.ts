import { findCouponByCode, CouponDocument } from '@/src/models/coupon';
import { findReferralByCode, markReferralRedeemed } from '@/src/models/referral';
import { getWalletBalance, adjustWalletBalance } from '@/src/models/wallet';
import { listOrders } from '@/src/models/order';
import type { ClientSession } from 'mongodb';

export interface PromotionCalculationInput {
  userId: string;
  subtotal: number;
  deliveryCharge: number;
  additionalCharges: number;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  couponCode?: string | null;
  walletAmount?: number | null;
  referralCode?: string | null;
  paymentMethod?: string | null;
}

export interface PromotionCalculationResult {
  discountAmount: number;
  walletAmountUsed: number;
  totalAmount: number;
  couponCode: string | null;
  coupon?: CouponDocument | null;
  referralCode: string | null;
  referralApplied: boolean;
}

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value || 0);
  return Number.isFinite(n) ? n : fallback;
}

export async function calculatePromotions(input: PromotionCalculationInput, session?: ClientSession): Promise<PromotionCalculationResult> {
  const subtotal = Math.max(0, toNumber(input.subtotal));
  const deliveryCharge = Math.max(0, toNumber(input.deliveryCharge));
  const additionalCharges = Math.max(0, toNumber(input.additionalCharges));
  const baseAmount = subtotal + deliveryCharge + additionalCharges;

  let discountAmount = 0;
  let coupon: CouponDocument | null = null;
  let couponCode: string | null = null;

  if (input.couponCode) {
    const normalizedCode = input.couponCode.trim().toUpperCase();
    coupon = await findCouponByCode(normalizedCode, session);
    if (!coupon) throw new Error('Invalid coupon code');

    const now = new Date();
    if (!coupon.isActive) throw new Error('Coupon is not active');
    if (now < coupon.startAt) throw new Error('Coupon is not active yet');
    if (now > coupon.endAt) throw new Error('Coupon has expired');
    if (coupon.minimumOrderAmount > baseAmount) throw new Error('Minimum order amount not met');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new Error('Coupon usage limit reached');

    const previousUses = await listOrders({ userId: input.userId, couponCode: normalizedCode }, session);
    if (coupon.perUserLimit && previousUses.length >= coupon.perUserLimit) {
      throw new Error('Coupon usage limit reached for this user');
    }

    if (coupon.paymentMethod && coupon.paymentMethod.trim().length > 0) {
      const normalizedPaymentMethod = coupon.paymentMethod.trim().toUpperCase();
      const requestedMethod = input.paymentMethod?.trim().toUpperCase() || 'COD';
      if (normalizedPaymentMethod !== requestedMethod) {
        throw new Error(`Coupon ${coupon.code} is only valid for ${normalizedPaymentMethod} payments`);
      }
    }

    if (coupon.discountType === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, coupon.discountValue));
      discountAmount = Math.round((baseAmount * pct) / 100 * 100) / 100;
      if (coupon.maximumDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maximumDiscount);
      }
    } else {
      discountAmount = Math.min(Math.max(0, coupon.discountValue), baseAmount);
    }

    couponCode = normalizedCode;
  }

  const amountAfterCoupon = Math.max(0, baseAmount - discountAmount);
  const requestedWalletAmount = Math.max(0, toNumber(input.walletAmount));
  const availableBalance = await getWalletBalance(input.userId, session);
  const walletAmountUsed = Math.min(requestedWalletAmount, availableBalance, amountAfterCoupon);

  const totalAmount = Math.max(0, amountAfterCoupon - walletAmountUsed);

  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    walletAmountUsed: Math.round(walletAmountUsed * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    couponCode,
    coupon,
    referralCode: null,
    referralApplied: false,
  };
}

export async function finalizeReferralReward(orderNumber: string, userId: string, referralCode: string, session?: ClientSession) {
  const referral = await findReferralByCode(referralCode, session);
  if (!referral || !referral.isActive) return false;
  if (referral.referredUserId) return false;
  const update = await markReferralRedeemed(referralCode, userId, session);
  if (!update.modifiedCount) return false;
  await adjustWalletBalance(String(referral.referrerUserId), referral.rewardValue, 'Referral reward', orderNumber, 'REFERRAL_REWARD', session);
  return true;
}
