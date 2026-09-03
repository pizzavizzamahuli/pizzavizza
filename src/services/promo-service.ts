import { findCouponByCode, CouponDocument } from '@/src/models/coupon';
import { findReferralByCode, qualifyReferral, markReferralRewarded } from '@/src/models/referral';
import { getWalletBalance, adjustWalletBalance } from '@/src/models/wallet';
import { listOrders } from '@/src/models/order';
import type { ClientSession } from 'mongodb';
import { notifyUser } from '@/src/services/notification-service';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { getUserById } from '@/src/services/user-service';

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
  let appliedReferralCode: string | null = null;
  let referralApplied = false;
  const referralSettings = await getRestaurantSettings();

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

  if (input.referralCode) {
    if (!referralSettings.referralEnabled) throw new Error('Referral programme is currently unavailable');
    const referralCode = input.referralCode.trim().toUpperCase();
    const referral = await findReferralByCode(referralCode, session);
    if (!referral || !referral.isActive || referral.status !== 'PENDING' || (referral.referredUserId && String(referral.referredUserId) !== input.userId) || String(referral.referrerUserId) === input.userId) {
      throw new Error('Invalid referral code');
    }
    appliedReferralCode = referralCode;
    referralApplied = true;
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
    referralCode: appliedReferralCode,
    referralApplied,
  };
}

export async function qualifyReferralReward(order: { orderNumber: string; userId: string; totalAmount: number; paymentStatus: string; paymentMethod?: string | null; orderStatus: string }, session?: ClientSession) {
  const successfulPayment = order.paymentStatus === 'PAID' || (order.paymentMethod === 'COD' && order.paymentStatus === 'PENDING');
  if (!successfulPayment || order.orderStatus !== 'COMPLETED') return false;
  const settings = await getRestaurantSettings();
  if (!settings.referralEnabled || order.totalAmount < settings.referralMinimumOrderAmount) return false;
  const user = await getUserById(order.userId);
  const code = user?.referredByReferralCode;
  if (!code) return false;
  const referral = await findReferralByCode(code, session);
  if (!referral || !referral.isActive || referral.status !== 'PENDING' || String(referral.referrerUserId) === order.userId) return false;
  const qualified = await qualifyReferral(code, order.userId, order.orderNumber, order.totalAmount, settings.referralReferrerRewardAmount, settings.referralReferredRewardAmount, session);
  const reward = qualified || (await findReferralByCode(code, session));
  if (!reward || !['QUALIFIED', 'REWARDED'].includes(reward.status)) return false;
  if (reward.status === 'REWARDED') return true;
  await adjustWalletBalance(String(reward.referrerUserId), reward.referrerRewardAmount || 0, 'Referral reward', `${order.orderNumber}:referrer`, 'REFERRAL_REWARD', session);
  await adjustWalletBalance(order.userId, reward.referredRewardAmount || 0, 'New customer referral reward', `${order.orderNumber}:referred`, 'REFERRAL_REWARD', session);
  const marked = await markReferralRewarded(code, order.userId, session);
  if (marked.modifiedCount) {
    notifyUser(String(reward.referrerUserId), { type: 'REFERRAL_REWARD', title: 'Referral reward credited', message: `You earned INR ${reward.referrerRewardAmount || 0} from order ${order.orderNumber}.`, href: '/account/wallet', relatedType: 'order', relatedId: order.orderNumber, eventKey: `referral:${order.orderNumber}:referrer` }).catch((error) => console.error('Referral notification failed', error));
    notifyUser(order.userId, { type: 'REFERRAL_REWARD', title: 'Welcome reward credited', message: `INR ${reward.referredRewardAmount || 0} referral credit was added to your wallet.`, href: '/account/wallet', relatedType: 'order', relatedId: order.orderNumber, eventKey: `referral:${order.orderNumber}:referred` }).catch((error) => console.error('Referral notification failed', error));
  }
  return true;
}
