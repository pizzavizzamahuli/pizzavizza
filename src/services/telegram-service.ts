import { env } from '@/src/config/env';
import { recordTelegramAudit } from '@/src/models/telegram-audit';
import { listActiveTelegramAdmins } from '@/src/models/telegram-admin';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

import { getSecret } from '@/src/services/secret-service';

async function getBotToken() {
  const fromSecret = await getSecret('telegramBotToken');
  if (fromSecret) return fromSecret;
  return env.TELEGRAM_BOT_TOKEN || '';
}

async function sendTelegramApi(method: string, body: Record<string, unknown>) {
  const token = await getBotToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return json;
}

export async function sendMessage(chatId: string | number, text: string, options?: Record<string, unknown>) {
  try {
    const payload = { chat_id: chatId, text, parse_mode: 'Markdown', ...options };
    const result = await sendTelegramApi('sendMessage', payload);
    await recordTelegramAudit({ telegramUserId: String(chatId), action: 'send_message', payload: { text }, timestamp: new Date() });
    return result;
  } catch (err) {
    await recordTelegramAudit({ telegramUserId: String(chatId), action: 'send_message_failed', payload: { error: String(err) }, timestamp: new Date() });
    throw err;
  }
}

export async function sendPhoto(chatId: string | number, photoUrl: string, caption?: string, options?: Record<string, unknown>) {
  try {
    const payload: Record<string, unknown> = { chat_id: chatId, photo: photoUrl, caption, parse_mode: 'Markdown', ...(options || {}) };
    const result = await sendTelegramApi('sendPhoto', payload);
    await recordTelegramAudit({ telegramUserId: String(chatId), action: 'send_photo', payload: { photoUrl, caption }, timestamp: new Date() });
    return result;
  } catch (err) {
    await recordTelegramAudit({ telegramUserId: String(chatId), action: 'send_photo_failed', payload: { error: String(err) }, timestamp: new Date() });
    throw err;
  }
}

export async function safeNotify(chatId: string | number, text: string, options?: Record<string, unknown>) {
  try {
    return await sendMessage(chatId, text, options);
  } catch (err) {
    // Do not let Telegram errors bubble up and break main flows.
    console.error('Telegram notify failed', err);
    return null;
  }
}

type OrderLike = {
  orderNumber: string;
  customerSnapshot?: { name?: string; mobile?: string | null | undefined } | null;
  fulfillmentType?: string | null;
  deliveryAddress?: { addressLine1?: string; addressLine2?: string | null; latitude?: number | null; longitude?: number | null; googleMapsUrl?: string | null } | null;
  items?: Array<{ name: string; quantity: number; subtotal: number }>;
  totalAmount: number;
  orderStatus?: string;
  deliveryCharge?: number;
  subtotal?: number;
  discount?: number;
  walletAmount?: number;
  couponCode?: string | null;
  referralCode?: string | null;
  paymentMethod?: string | null;
  paymentProofUrl?: string | null;
};

export async function notifyNewOrder(order: OrderLike) {
  try {
    const settings = await getRestaurantSettings();
    if (!settings.telegramEnabled || !settings.telegramOrderNotificationsEnabled) return;

    const admins = await listActiveTelegramAdmins();
    if (!admins || admins.length === 0) return;

    const summaryLines: string[] = [];
    summaryLines.push('*🔔 NEW ORDER*');
    summaryLines.push(`*Order:* ${order.orderNumber}`);
    summaryLines.push(`*Customer:* ${order.customerSnapshot?.name || 'Unknown'} ${order.customerSnapshot?.mobile ? '• ' + order.customerSnapshot.mobile : ''}`);
    summaryLines.push(`*Type:* ${order.fulfillmentType}`);
    if (order.deliveryAddress && order.deliveryAddress.addressLine1) {
      summaryLines.push(`*Address:* ${order.deliveryAddress.addressLine1}${order.deliveryAddress.addressLine2 ? ' ' + order.deliveryAddress.addressLine2 : ''}`);
      if (typeof order.deliveryAddress.latitude === 'number' && typeof order.deliveryAddress.longitude === 'number') {
        summaryLines.push(`*Coordinates:* ${order.deliveryAddress.latitude}, ${order.deliveryAddress.longitude}`);
      }
      if (order.deliveryAddress.googleMapsUrl) summaryLines.push(`Maps: ${order.deliveryAddress.googleMapsUrl}`);
    }
    summaryLines.push('');
    summaryLines.push('*Items:*');
    for (const it of (order.items || []).slice(0, 10)) {
      summaryLines.push(`${it.name} × ${it.quantity} — ₹${it.subtotal.toFixed(2)}`);
    }
    summaryLines.push('');
    summaryLines.push(`*Total:* ₹${order.totalAmount.toFixed(2)}`);
    if (order.couponCode) summaryLines.push(`*Coupon:* ${order.couponCode}`);
    if (order.referralCode) summaryLines.push(`*Referral:* ${order.referralCode}`);
    if ((order.walletAmount || 0) > 0) summaryLines.push(`*Wallet used:* ₹${(order.walletAmount || 0).toFixed(2)}`);
    summaryLines.push(`*Status:* ${order.orderStatus}`);

    const text = summaryLines.join('\n');

    await Promise.all(admins.map((a) => safeNotify(a.telegramChatId, text)));
  } catch (err) {
    console.error('notifyNewOrder error', err);
  }
}

type BookingLike = {
  bookingNumber: string;
  customerSnapshot?: { name?: string; mobile?: string | null | undefined } | null;
  roomSnapshot?: { name?: string } | null;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  guestCount?: number;
  finalAmount?: number | undefined;
  bookingStatus?: string;
  customerNote?: string | null;
};

export async function notifyNewBooking(booking: BookingLike) {
  try {
    const settings = await getRestaurantSettings();
    if (!settings.telegramEnabled || !settings.telegramBookingNotificationsEnabled) return;

    const admins = await listActiveTelegramAdmins();
    if (!admins || admins.length === 0) return;

    const lines: string[] = [];
    lines.push('*🍽 NEW DINING BOOKING*');
    lines.push(`*Booking:* ${booking.bookingNumber}`);
    lines.push(`*Customer:* ${booking.customerSnapshot?.name || 'Unknown'} ${booking.customerSnapshot?.mobile ? '• ' + booking.customerSnapshot.mobile : ''}`);
    lines.push(`*Room:* ${booking.roomSnapshot?.name}`);
    lines.push(`*Date:* ${booking.bookingDate}`);
    lines.push(`*Time:* ${booking.startTime} - ${booking.endTime}`);
    lines.push(`*Guests:* ${booking.guestCount}`);
    lines.push(`*Amount:* ₹${(booking.finalAmount ?? 0).toFixed(2)}`);
    lines.push(`*Status:* ${booking.bookingStatus}`);

    const text = lines.join('\n');
    await Promise.all(admins.map((a) => safeNotify(a.telegramChatId, text)));
  } catch (err) {
    console.error('notifyNewBooking error', err);
  }
}

export async function notifyPaymentProof(order: OrderLike) {
  try {
    const settings = await getRestaurantSettings();
    if (!settings.telegramEnabled || !settings.telegramPaymentNotificationsEnabled) return;

    const admins = await listActiveTelegramAdmins();
    if (!admins || admins.length === 0) return;

    const captionLines: string[] = [];
    captionLines.push('*🔔 PAYMENT VERIFICATION REQUIRED*');
    captionLines.push(`*Order:* ${order.orderNumber}`);
    captionLines.push(`*Customer:* ${order.customerSnapshot?.name || 'Unknown'} ${order.customerSnapshot?.mobile ? '• ' + order.customerSnapshot.mobile : ''}`);
    captionLines.push(`*Amount:* ₹${order.totalAmount.toFixed(2)}`);
    captionLines.push(`*Method:* ${order.paymentMethod || 'Manual'}`);
    captionLines.push('');
    captionLines.push('Use the buttons below to verify or reject this payment.');

    // Build inline keyboard reply markup
    const replyMarkup: Record<string, unknown> = {
      inline_keyboard: [
        [
          { text: '✅ Verify', callback_data: `payment:verify:${order.orderNumber}` },
          { text: '❌ Reject', callback_data: `payment:reject:${order.orderNumber}` },
          { text: '👁 View Order', callback_data: `order:view:${order.orderNumber}` },
        ],
      ],
    };

    const caption = captionLines.join('\n');

    await Promise.all(admins.map((a) => sendPhoto(a.telegramChatId, order.paymentProofUrl || '', caption, { reply_markup: replyMarkup })));
  } catch (err) {
    console.error('notifyPaymentProof error', err);
  }
}
