import { NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { findTelegramAdminByChat, linkTelegramAdmin } from '@/src/models/telegram-admin';
import { consumeLinkCode } from '@/src/models/telegram-link-code';
import { safeAnswerCallbackQuery, safeNotify } from '@/src/services/telegram-service';
import { recordTelegramAudit } from '@/src/models/telegram-audit';
import {
  findOrderByOrderNumber,
  updateOrderByOrderNumber,
  assignDeliveryStaff,
  updateOrderStatusByOrderNumber,
  searchOrders,
  canTransitionOrderStatus,
  validOrderStatusTransitions,
} from '@/src/models/order';
import type { OrderDocument, OrderStatus } from '@/src/models/order';
import {
  findDiningBookingByBookingNumber,
  searchDiningBookings,
  updateDiningBooking,
  canTransitionDiningBookingStatus,
  validDiningBookingStatusTransitions,
} from '@/src/models/dining-booking';
import type { DiningBookingDocument, DiningBookingStatus } from '@/src/models/dining-booking';
import { getUserById } from '@/src/services/user-service';
import { getRestaurantName } from '@/src/services/brand-service';
import { AuthorizationService } from '@/src/config/permissions';
import { ObjectId } from 'mongodb';
import { notifyAdmins, notifyUser } from '@/src/services/notification-service';
import { isOrderPaymentCleared } from '@/src/services/payment-service';
import { claimTelegramUpdate } from '@/src/models/telegram-update';

type TelegramChat = {
  id: number | string;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramUser = {
  id: number | string;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TelegramMessage = {
  message_id?: number;
  date?: number;
  chat?: TelegramChat;
  from?: TelegramUser;
  text?: string;
};

type TelegramCallbackQuery = {
  id?: string;
  from?: TelegramUser;
  message?: { chat?: TelegramChat; message_id?: number; text?: string };
  data?: string;
};

type TelegramPayload = {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  [key: string]: unknown;
};

type TelegramMessageOrCallback = TelegramMessage | TelegramCallbackQuery;

function maskTelegramId(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  if (!raw) return 'empty';
  if (raw.length <= 4) return '***';
  return `***${raw.slice(-4)}`;
}

function getTelegramMessageFormat(text: string | null | undefined): 'plain' | '/link' | '/start' | '/link@bot' | '/start@bot' | 'other' | 'empty' {
  if (typeof text !== 'string') return 'empty';
  const trimmed = text.trim();
  if (!trimmed) return 'empty';
  if (/^\/link(?:@\w+)?\s+.+$/i.test(trimmed)) return '/link';
  if (/^\/start(?:@\w+)?\s+.+$/i.test(trimmed)) return '/start';
  if (/^\/link(?:@\w+)?$/i.test(trimmed)) return '/link';
  if (/^\/start(?:@\w+)?$/i.test(trimmed)) return '/start';
  if (/^\/link@\w+\s+.+$/i.test(trimmed)) return '/link@bot';
  if (/^\/start@\w+\s+.+$/i.test(trimmed)) return '/start@bot';
  if (/^\/link@\w+$/i.test(trimmed)) return '/link@bot';
  if (/^\/start@\w+$/i.test(trimmed)) return '/start@bot';
  return 'plain';
}

function extractTelegramLinkCode(text: string | null | undefined): string | null {
  if (typeof text !== 'string') return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^\/(?:link|start)(?:@\w+)?\s+(.+)$/i) || trimmed.match(/^\/(?:link|start)(?:@\w+)?$/i);
  if (match) {
    const candidate = (match[1] || '').trim();
    if (!candidate) return null;
    return candidate.startsWith('/') ? null : candidate;
  }

  if (trimmed.startsWith('/')) return null;
  return trimmed;
}

function isTelegramCallbackQuery(value: TelegramMessageOrCallback): value is TelegramCallbackQuery {
  return Object.prototype.hasOwnProperty.call(value, 'data');
}

function isOrderStatus(value: string): value is OrderStatus {
  return Object.prototype.hasOwnProperty.call(validOrderStatusTransitions, value);
}

function isDiningBookingStatus(value: string): value is DiningBookingStatus {
  return Object.prototype.hasOwnProperty.call(validDiningBookingStatusTransitions, value);
}

const markdownEscape = (value: string) => String(value || '').replace(/([_\*\[\]()~`>#+\-=|{}.!])/g, '\\$1');

function buildOrderDetailLines(order: OrderDocument, restaurantName: string) {
  const lines: string[] = [];
  lines.push(`*${markdownEscape(restaurantName)}*`);
  lines.push('');
  lines.push(`*Order:* ${markdownEscape(order.orderNumber)}`);
  lines.push('');
  lines.push(`*Customer:* ${markdownEscape(order.customerSnapshot.name || 'Unknown')}`);
  if (order.customerSnapshot.mobile) lines.push(`*Mobile:* ${markdownEscape(order.customerSnapshot.mobile)}`);
  lines.push(`*Fulfillment:* ${markdownEscape(order.fulfillmentType)}`);

  if (order.deliveryAddress) {
    const a = order.deliveryAddress;
    lines.push('');
    lines.push('*Address:*');
    lines.push(`${markdownEscape(a.fullName)}`);
    lines.push(`${markdownEscape(a.addressLine1)}${a.addressLine2 ? ' ' + markdownEscape(a.addressLine2) : ''}`);
    if (a.landmark) lines.push(`${markdownEscape(a.landmark)}`);
    lines.push(`${markdownEscape(a.city)}, ${markdownEscape(a.state)} ${markdownEscape(a.postalCode)}`);
    if (a.googleMapsUrl) lines.push(`Maps: ${markdownEscape(a.googleMapsUrl)}`);
  }

  lines.push('');
  lines.push('*Items:*');
  for (const it of order.items.slice(0, 30)) {
    lines.push(`${markdownEscape(it.name)} × ${it.quantity} — ₹${it.subtotal.toFixed(2)}`);
  }

  lines.push('');
  if (order.discount && order.discount > 0) lines.push(`*Discount:* ₹${order.discount.toFixed(2)}`);
  if (order.walletAmount && order.walletAmount > 0) lines.push(`*Wallet:* ₹${order.walletAmount.toFixed(2)}`);
  lines.push(`*Delivery:* ₹${order.deliveryCharge.toFixed(2)}`);
  lines.push(`*Subtotal:* ₹${order.subtotal.toFixed(2)}`);
  lines.push(`*Total:* ₹${order.totalAmount.toFixed(2)}`);
  lines.push('');
  lines.push(`*Payment:* ${markdownEscape(order.paymentMethod || 'Unknown')} — ${markdownEscape(order.paymentStatus)}`);
  lines.push(`*Order Status:* ${markdownEscape(order.orderStatus)}`);
  return lines;
}

function buildBookingDetailLines(booking: DiningBookingDocument, restaurantName: string) {
  const lines: string[] = [];
  lines.push(`*${markdownEscape(restaurantName)}*`);
  lines.push('');
  lines.push(`*Booking:* ${markdownEscape(booking.bookingNumber)}`);
  lines.push('');
  lines.push(`*Customer:* ${markdownEscape(booking.customerSnapshot.name || 'Unknown')}`);
  if (booking.customerSnapshot.mobile) lines.push(`*Mobile:* ${markdownEscape(booking.customerSnapshot.mobile)}`);
  lines.push(`*Room:* ${markdownEscape(booking.roomSnapshot.name)}`);
  lines.push(`*Date:* ${markdownEscape(booking.bookingDate)}`);
  lines.push(`*Time:* ${markdownEscape(booking.startTime)} - ${markdownEscape(booking.endTime)}`);
  lines.push(`*Guests:* ${booking.guestCount}`);
  lines.push('');
  lines.push(`*Amount:* ₹${booking.finalAmount.toFixed(2)}`);
  lines.push(`*Payment:* ${markdownEscape(booking.paymentMethod || 'Unknown')} — ${markdownEscape(booking.paymentStatus)}`);
  lines.push(`*Booking Status:* ${markdownEscape(booking.bookingStatus)}`);
  if (booking.customerNote) {
    lines.push('');
    lines.push(`*Customer note:* ${markdownEscape(booking.customerNote)}`);
  }
  return lines;
}

function buildOrderActionMarkup(order: OrderDocument, canManage: boolean) {
  const keyboard: Array<Array<Record<string, string>>> = [];
  if (canManage) {
    const allowedStatuses = validOrderStatusTransitions[order.orderStatus] || [];
    for (const status of allowedStatuses) {
      keyboard.push([{ text: status, callback_data: `order:status:${order.orderNumber}:${status}` }]);
    }
  }
  keyboard.push([{ text: 'Refresh order', callback_data: `order:view:${order.orderNumber}` }]);
  return { inline_keyboard: keyboard };
}

function buildBookingActionMarkup(booking: DiningBookingDocument, canManage: boolean) {
  const keyboard: Array<Array<Record<string, string>>> = [];
  if (canManage) {
    const allowedStatuses = validDiningBookingStatusTransitions[booking.bookingStatus] || [];
    for (const status of allowedStatuses) {
      keyboard.push([{ text: status, callback_data: `booking:status:${booking.bookingNumber}:${status}` }]);
    }
  }
  keyboard.push([{ text: 'Refresh booking', callback_data: `booking:view:${booking.bookingNumber}` }]);
  return { inline_keyboard: keyboard };
}

async function sendOrderDetails(chatId: string | number, order: OrderDocument, canManage: boolean) {
  const lines = buildOrderDetailLines(order, await getRestaurantName());
  const replyMarkup = buildOrderActionMarkup(order, canManage);
  return safeNotify(chatId, lines.join('\n'), { reply_markup: replyMarkup, disable_web_page_preview: true });
}

async function sendBookingDetails(chatId: string | number, booking: DiningBookingDocument, canManage: boolean) {
  const lines = buildBookingDetailLines(booking, await getRestaurantName());
  const replyMarkup = buildBookingActionMarkup(booking, canManage);
  return safeNotify(chatId, lines.join('\n'), { reply_markup: replyMarkup, disable_web_page_preview: true });
}

export async function POST(request: Request) {
  // Validate webhook secret header
  try {
    const secret = env.TELEGRAM_WEBHOOK_SECRET || '';
    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token') || '';
    const secretValidated = !!secret && !!secretHeader && secretHeader === secret;
    console.info('[telegram-webhook]', {
      event: 'webhook_received',
      secretConfigured: !!secret,
      secretHeaderPresent: !!secretHeader,
      secretValidated,
      method: request.method,
    });

    if (env.NODE_ENV === 'production' && !secret) {
      console.warn('[telegram-webhook]', { event: 'missing_secret_config', status: 503 });
      return NextResponse.json({ error: 'Telegram webhook secret is not configured' }, { status: 503 });
    }
    if (secret) {
      if (!secretHeader || secretHeader !== secret) {
        console.warn('[telegram-webhook]', { event: 'secret_validation_failed', status: 403, secretHeaderPresent: !!secretHeader });
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 403 });
      }
    }

    const rawPayload = await request.json();

    if (!rawPayload || typeof rawPayload !== 'object') {
      console.info('[telegram-webhook]', { event: 'invalid_payload_skipped', status: 200 });
      return NextResponse.json({ ok: true });
    }

    const payload = rawPayload as TelegramPayload;
    const updateId = typeof payload.update_id === 'number' ? payload.update_id : null;
    const updateType = payload.message ? 'message' : payload.edited_message ? 'edited_message' : payload.callback_query ? 'callback_query' : 'unknown';
    console.info('[telegram-webhook]', {
      event: 'payload_received',
      updateId,
      updateType,
      hasMessage: !!payload.message,
      hasEditedMessage: !!payload.edited_message,
      hasCallbackQuery: !!payload.callback_query,
    });

    if (typeof payload.update_id === 'number' && !(await claimTelegramUpdate(payload.update_id))) {
      console.info('[telegram-webhook]', { event: 'duplicate_update_ignored', updateId: payload.update_id, status: 200 });
      return NextResponse.json({ ok: true, duplicate: true });
    }
    const message = payload.message ?? payload.edited_message ?? payload.callback_query ?? null;
    if (!message) {
      console.info('[telegram-webhook]', { event: 'no_message_or_callback', status: 200 });
      return NextResponse.json({ ok: true });
    }

    let chat: TelegramChat | null = null;
    if ('chat' in message && message.chat) {
      chat = message.chat;
    } else if ('message' in message && message.message?.chat) {
      chat = message.message.chat;
    } else if (message.from) {
      chat = { id: message.from.id };
    }

    const chatIdRaw = chat?.id;
    const chatId = chatIdRaw != null ? String(chatIdRaw) : null;
    const chatType = chat?.type || 'unknown';
    console.info('[telegram-webhook]', {
      event: 'chat_extracted',
      chatType,
      chatIdMasked: maskTelegramId(chatId),
      chatIdPresent: !!chatId,
      fromIdMasked: maskTelegramId(message.from?.id),
      usernamePresent: !!message.from?.username,
    });

    const allowed = new Set((env.TELEGRAM_ALLOWED_CHAT_IDS || '').split(',').map((s: string) => s.trim()).filter(Boolean));
    if (allowed.size > 0 && chatId && !allowed.has(chatId)) {
      console.info('[telegram-webhook]', { event: 'chat_not_allowed', chatIdMasked: maskTelegramId(chatId), status: 200 });
      return NextResponse.json({ ok: true });
    }

    const text = isTelegramCallbackQuery(message) ? message.data ?? '' : message.text ?? '';
    const messageFormat = getTelegramMessageFormat(text);
    console.info('[telegram-webhook]', {
      event: 'message_text_parsed',
      messageTextExists: typeof text === 'string' && text.trim().length > 0,
      messageFormat,
      chatType,
    });

    if (!chatId) {
      console.warn('[telegram-webhook]', { event: 'chat_id_missing', status: 200 });
      return NextResponse.json({ ok: true });
    }

    await recordTelegramAudit({ telegramUserId: String(chatId), action: 'received_update', payload: message as Record<string, unknown>, timestamp: new Date() });

    if (typeof text === 'string') {
      const rawCode = extractTelegramLinkCode(text);
      const linkingBranchEntered = rawCode !== null;
      console.info('[telegram-webhook]', {
        event: 'linking_branch_check',
        linkingBranchEntered,
        messageFormat,
      });

      if (linkingBranchEntered) {
        const consumed = await consumeLinkCode(rawCode!);
        console.info('[telegram-webhook]', {
          event: 'consume_link_code_result',
          result: consumed.ok ? 'success' : consumed.reason || 'unknown',
          status: consumed.ok ? 'success' : 'rejected',
        });

        if (!consumed.ok) {
          await safeNotify(chatId, `Linking failed: ${consumed.reason}`);
          return NextResponse.json({ ok: true });
        }

        if (!consumed.record) {
          await safeNotify(chatId, 'Linking failed: invalid code');
          return NextResponse.json({ ok: true });
        }

        const userId = consumed.record.userId;
        const linked = await linkTelegramAdmin(userId, String(message.from?.id || ''), String(chatId));
        console.info('[telegram-webhook]', {
          event: 'telegram_admin_write',
          databaseWriteSucceeded: !!linked,
          linkedUserId: userId ? 'present' : 'missing',
          chatIdMasked: maskTelegramId(chatId),
        });

        if (!linked) {
          await safeNotify(chatId, 'This Telegram chat is already linked to another account. Revoke it before linking a new account.');
          return NextResponse.json({ ok: true });
        }

        try {
          const notifyResult = await safeNotify(chatId, 'Telegram account linked successfully.');
          console.info('[telegram-webhook]', {
            event: 'telegram_success_response',
            result: notifyResult ? 'sent' : 'failed',
            status: notifyResult ? 'success' : 'failed',
          });
        } catch (error) {
          console.error('[telegram-webhook]', { event: 'telegram_success_response_error', message: error instanceof Error ? error.message : 'unknown' });
        }
        return NextResponse.json({ ok: true });
      }
    }

    // Handle callback_query inline actions
    if (payload.callback_query) {
      const cb = payload.callback_query;
      const data = cb.data || '';
      const fromId = String(cb.from?.id || '');

      if (cb.id) await safeAnswerCallbackQuery(cb.id, 'Processing…');

      await recordTelegramAudit({ telegramUserId: fromId, action: 'callback_received', payload: cb as Record<string, unknown>, timestamp: new Date() });

      // Expected formats: payment:verify:<orderNumber> | payment:reject:<orderNumber> | order:view:<orderNumber>
      const parts = String(data).split(':');
      if (parts.length >= 3) {
        const [domain, action, target] = parts;

        const linked = await findTelegramAdminByChat(String(cb.message?.chat?.id || fromId));
        if (!linked || linked.status !== 'ACTIVE' || (linked.telegramUserId && linked.telegramUserId !== fromId)) {
          await safeNotify(fromId, 'You are not authorized to perform this action.');
          return NextResponse.json({ ok: true });
        }

        const appUser = await getUserById(linked.userId);
        if (!appUser) {
          await safeNotify(fromId, 'Linked user not found.');
          return NextResponse.json({ ok: true });
        }

        if (domain === 'payment' && action === 'verify') {
          if (!AuthorizationService.canAccess(appUser.role, 'telegram.verifyPayments')) {
            await safeNotify(fromId, 'You are not authorized to verify payments.');
            return NextResponse.json({ ok: true });
          }

          const order = await findOrderByOrderNumber(target);
          if (!order) {
            await safeNotify(fromId, `Order not found: ${target}`);
            return NextResponse.json({ ok: true });
          }

          if (order.paymentStatus === 'PAID') {
            await safeNotify(fromId, `Order ${target} already marked as PAID.`);
            return NextResponse.json({ ok: true });
          }

          if (!['PENDING', 'AWAITING_VERIFICATION'].includes(order.paymentStatus)) {
            await safeNotify(fromId, `Order ${target} is not awaiting payment verification.`);
            return NextResponse.json({ ok: true });
          }

          await updateOrderByOrderNumber(target, { paymentStatus: 'PAID' });
          void notifyUser(order.userId, { type: 'PAYMENT_APPROVED', title: 'Payment verified', message: `Payment for order ${target} has been verified.`, href: `/account/orders/${target}`, relatedType: 'order', relatedId: target, eventKey: `telegram:payment:verified:${target}` }).catch((error) => console.error('Telegram payment notification failed', error));
          void notifyAdmins({ type: 'PAYMENT_APPROVED', title: 'Payment verified', message: `Payment for order ${target} was verified via Telegram.`, href: `/admin/orders/${target}`, relatedType: 'order', relatedId: target, permission: 'payments.view', eventKey: `telegram:payment:admin:${target}` }).catch((error) => console.error('Telegram admin notification failed', error));
          await recordTelegramAudit({ performedByUserId: appUser._id?.toHexString() || null, telegramUserId: fromId, action: 'payment_verified', targetType: 'order', targetId: target, timestamp: new Date() });
          await safeNotify(fromId, `Order ${target} marked as PAID.`);
          return NextResponse.json({ ok: true });
        }

        if (domain === 'payment' && action === 'reject') {
          if (!AuthorizationService.canAccess(appUser.role, 'telegram.verifyPayments')) {
            await safeNotify(fromId, 'You are not authorized to reject payments.');
            return NextResponse.json({ ok: true });
          }

          const order = await findOrderByOrderNumber(target);
          if (!order) {
            await safeNotify(fromId, `Order not found: ${target}`);
            return NextResponse.json({ ok: true });
          }

          if (['PAID', 'REFUNDED'].includes(order.paymentStatus)) {
            await safeNotify(fromId, `Order ${target} payment cannot be rejected from its current state.`);
            return NextResponse.json({ ok: true });
          }

          await updateOrderByOrderNumber(target, { paymentStatus: 'FAILED' });
          void notifyUser(order.userId, { type: 'PAYMENT_REJECTED', title: 'Payment rejected', message: `Payment for order ${target} was rejected.`, href: `/account/orders/${target}`, relatedType: 'order', relatedId: target, eventKey: `telegram:payment:rejected:${target}` }).catch((error) => console.error('Telegram payment notification failed', error));
          await recordTelegramAudit({ performedByUserId: appUser._id?.toHexString() || null, telegramUserId: fromId, action: 'payment_rejected', targetType: 'order', targetId: target, timestamp: new Date() });
          await safeNotify(fromId, `Order ${target} payment marked as FAILED.`);
          return NextResponse.json({ ok: true });
        }

        if (domain === 'order' && action === 'view') {
          const order = await findOrderByOrderNumber(target);
          if (!order) {
            await safeNotify(fromId, `Order not found: ${target}`);
            return NextResponse.json({ ok: true });
          }
          await sendOrderDetails(fromId, order, AuthorizationService.canAccess(appUser.role, 'telegram.manageOrders'));
          return NextResponse.json({ ok: true });
        }

        if (domain === 'order' && action === 'status' && parts.length === 4) {
          if (!AuthorizationService.canAccess(appUser.role, 'telegram.manageOrders')) {
            await safeNotify(fromId, 'You are not authorized to manage order status.');
            return NextResponse.json({ ok: true });
          }

          const nextStatus = parts[3] as string;
          const order = await findOrderByOrderNumber(target);
          if (!order) {
            await safeNotify(fromId, `Order not found: ${target}`);
            return NextResponse.json({ ok: true });
          }

          if (!isOrderStatus(nextStatus)) {
            await safeNotify(fromId, `Invalid order status: ${nextStatus}.`);
            return NextResponse.json({ ok: true });
          }

          if (order.orderStatus === nextStatus) {
            await safeNotify(fromId, `Order ${target} is already ${nextStatus}.`);
            return NextResponse.json({ ok: true });
          }

          if (!canTransitionOrderStatus(order.orderStatus, nextStatus)) {
            await safeNotify(fromId, `Cannot transition order from ${order.orderStatus} to ${nextStatus}.`);
            return NextResponse.json({ ok: true });
          }

          await updateOrderStatusByOrderNumber(target, nextStatus, appUser._id?.toHexString() || 'telegram', `Telegram status update to ${nextStatus}`);
          void notifyUser(order.userId, { type: `ORDER_${nextStatus}`, title: `Order ${nextStatus.toLowerCase()}`, message: `Your order ${target} is now ${nextStatus.toLowerCase()}.`, href: `/account/orders/${target}`, relatedType: 'order', relatedId: target, eventKey: `telegram:order:${target}:${nextStatus}` }).catch((error) => console.error('Telegram order notification failed', error));
          await recordTelegramAudit({ performedByUserId: appUser._id?.toHexString() || null, telegramUserId: fromId, action: 'order_status_updated', targetType: 'order', targetId: target, timestamp: new Date(), payload: { newStatus: nextStatus } });
          await safeNotify(fromId, `Order ${target} status updated to ${nextStatus}.`);
          return NextResponse.json({ ok: true });
        }

        if (domain === 'delivery' && action === 'assign' && parts.length === 4) {
          if (!AuthorizationService.canAccess(appUser.role, 'telegram.manageDelivery')) {
            await safeNotify(fromId, 'You are not authorized to manage delivery assignments.');
            return NextResponse.json({ ok: true });
          }
          const order = await findOrderByOrderNumber(target);
          const staffId = parts[3];
          let staff = null;
          try { staff = await (await import('@/src/models/user')).getUsersCollection().then((collection) => collection.findOne({ _id: new ObjectId(staffId), role: 'DELIVERY_STAFF', accountStatus: 'ACTIVE' })); } catch { staff = null; }
          if (!order || !staff) { await safeNotify(fromId, !order ? `Order not found: ${target}` : 'Active delivery staff member not found.'); return NextResponse.json({ ok: true }); }
          const assigned = await assignDeliveryStaff(target, staff._id!.toHexString(), staff.name, appUser._id?.toHexString() || 'telegram', order.deliveryStaffId || null);
          if (!assigned) { await safeNotify(fromId, 'Assignment changed concurrently. Please refresh the order.'); return NextResponse.json({ ok: true }); }
          await recordTelegramAudit({ performedByUserId: appUser._id?.toHexString() || null, telegramUserId: fromId, action: 'delivery_assigned', targetType: 'order', targetId: target, timestamp: new Date(), payload: { staffId } });
            void notifyUser(staff._id!.toHexString(), { type: 'DELIVERY_ASSIGNED', title: 'Delivery assigned', message: `Order ${target} has been assigned to you.`, href: '/delivery', relatedType: 'order', relatedId: target, eventKey: `telegram:delivery:${target}:${staff._id!.toHexString()}` }).catch((error) => console.error('Telegram delivery notification failed', error));
            void notifyUser(order.userId, { type: 'DELIVERY_ASSIGNED', title: 'Delivery assigned', message: `A delivery staff member has been assigned to order ${target}.`, href: `/account/orders/${target}`, relatedType: 'order', relatedId: target, eventKey: `telegram:delivery:customer:${target}` }).catch((error) => console.error('Telegram customer notification failed', error));
            void notifyAdmins({ type: 'DELIVERY_ASSIGNED', title: 'Delivery assignment updated', message: `Order ${target} was assigned to ${staff.name}.`, href: `/admin/orders/${target}`, relatedType: 'order', relatedId: target, permission: 'delivery.view', eventKey: `telegram:delivery:admin:${target}:${staff._id!.toHexString()}` }).catch((error) => console.error('Telegram admin notification failed', error));
            await safeNotify(fromId, `Order ${target} assigned to ${staff.name}.`);
          return NextResponse.json({ ok: true });
        }

        if (domain === 'booking' && action === 'view') {
          const booking = await findDiningBookingByBookingNumber(target);
          if (!booking) {
            await safeNotify(fromId, `Booking not found: ${target}`);
            return NextResponse.json({ ok: true });
          }
          await sendBookingDetails(fromId, booking, AuthorizationService.canAccess(appUser.role, 'telegram.manageBookings'));
          return NextResponse.json({ ok: true });
        }

        if (domain === 'booking' && action === 'status' && parts.length === 4) {
          if (!AuthorizationService.canAccess(appUser.role, 'telegram.manageBookings')) {
            await safeNotify(fromId, 'You are not authorized to manage booking status.');
            return NextResponse.json({ ok: true });
          }

          const nextStatus = parts[3] as string;
          if (!isDiningBookingStatus(nextStatus)) {
            await safeNotify(fromId, `Invalid booking status: ${nextStatus}.`);
            return NextResponse.json({ ok: true });
          }

          const booking = await findDiningBookingByBookingNumber(target);
          if (!booking) {
            await safeNotify(fromId, `Booking not found: ${target}`);
            return NextResponse.json({ ok: true });
          }

          if (booking.bookingStatus === nextStatus) {
            await safeNotify(fromId, `Booking ${target} is already ${nextStatus}.`);
            return NextResponse.json({ ok: true });
          }

          if (!canTransitionDiningBookingStatus(booking.bookingStatus, nextStatus)) {
            await safeNotify(fromId, `Cannot transition booking from ${booking.bookingStatus} to ${nextStatus}.`);
            return NextResponse.json({ ok: true });
          }

          await updateDiningBooking(booking._id!.toHexString(), {
            bookingStatus: nextStatus,
            statusHistory: [
              ...(booking.statusHistory || []),
              { previousStatus: booking.bookingStatus, newStatus: nextStatus, performedBy: appUser._id!.toHexString(), note: `Telegram status update to ${nextStatus}`, createdAt: new Date() },
            ],
          });
          void notifyUser(booking.userId, { type: `BOOKING_${nextStatus}`, title: `Booking ${nextStatus.toLowerCase()}`, message: `Your dining booking ${target} is now ${nextStatus.toLowerCase()}.`, href: `/account/bookings/${target}`, relatedType: 'booking', relatedId: target, eventKey: `telegram:booking:${target}:${nextStatus}` }).catch((error) => console.error('Telegram booking notification failed', error));
          await recordTelegramAudit({ performedByUserId: appUser._id?.toHexString() || null, telegramUserId: fromId, action: 'booking_status_updated', targetType: 'booking', targetId: target, timestamp: new Date(), payload: { newStatus: nextStatus } });
          await safeNotify(fromId, `Booking ${target} status updated to ${nextStatus}.`);
          return NextResponse.json({ ok: true });
        }
      }
      // unknown callback: ignore
      return NextResponse.json({ ok: true });
    }

    // Delivery assignment command: /assign <ORDER_NUMBER> <DELIVERY_STAFF_ID>
    if (typeof text === 'string' && text.startsWith('/assign')) {
      const parts = text.split(/\s+/);
      const orderNumber = parts[1];
      const staffId = parts[2];
      const linked = await findTelegramAdminByChat(String(chatId));
      const fromUserId = String(message.from?.id || '');
      const appUser = linked && (!linked.telegramUserId || linked.telegramUserId === fromUserId) ? await getUserById(linked.userId) : null;
      if (!linked || linked.status !== 'ACTIVE' || !appUser || !AuthorizationService.canAccess(appUser.role, 'telegram.manageDelivery')) {
        await safeNotify(chatId, 'You are not authorized to manage delivery assignments.');
        return NextResponse.json({ ok: true });
      }
      if (!orderNumber || !staffId) { await safeNotify(chatId, 'Usage: /assign <order number> <delivery staff id>'); return NextResponse.json({ ok: true }); }
      const order = await findOrderByOrderNumber(orderNumber);
      let staff = null;
      try { staff = await (await import('@/src/models/user')).getUsersCollection().then((collection) => collection.findOne({ _id: new ObjectId(staffId), role: 'DELIVERY_STAFF', accountStatus: 'ACTIVE' })); } catch { staff = null; }
      if (!order || !staff) { await safeNotify(chatId, !order ? `Order not found: ${orderNumber}` : 'Active delivery staff member not found.'); return NextResponse.json({ ok: true }); }
      if (order.fulfillmentType !== 'DELIVERY' || order.orderStatus !== 'READY' || !isOrderPaymentCleared(order.paymentMethod, order.paymentStatus)) {
        await safeNotify(chatId, 'Only payment-cleared READY delivery orders can be assigned.');
        return NextResponse.json({ ok: true });
      }
      const assigned = await assignDeliveryStaff(orderNumber, staff._id!.toHexString(), staff.name, appUser._id?.toHexString() || 'telegram', order.deliveryStaffId || null);
      if (!assigned) {
        await safeNotify(chatId, 'Assignment changed concurrently. Please refresh the order.');
        return NextResponse.json({ ok: true });
      }
      await recordTelegramAudit({ performedByUserId: appUser._id?.toHexString() || null, telegramUserId: chatId, action: 'delivery_assigned', targetType: 'order', targetId: orderNumber, timestamp: new Date(), payload: { staffId } });
      void notifyUser(staff._id!.toHexString(), { type: 'DELIVERY_ASSIGNED', title: 'Delivery assigned', message: `Order ${orderNumber} has been assigned to you.`, href: '/delivery', relatedType: 'order', relatedId: orderNumber, eventKey: `telegram:command:delivery:${orderNumber}:${staff._id!.toHexString()}` }).catch((error) => console.error('Telegram delivery notification failed', error));
      void notifyUser(order.userId, { type: 'DELIVERY_ASSIGNED', title: 'Delivery assigned', message: `A delivery staff member has been assigned to order ${orderNumber}.`, href: `/account/orders/${orderNumber}`, relatedType: 'order', relatedId: orderNumber, eventKey: `telegram:command:delivery:customer:${orderNumber}` }).catch((error) => console.error('Telegram customer notification failed', error));
      await safeNotify(chatId, `Order ${orderNumber} assigned to ${staff.name}.`);
      return NextResponse.json({ ok: true });
    }

    // Order lookup command: /order <ORDER_NUMBER>
    if (typeof text === 'string' && text.startsWith('/order')) {
      const parts = text.split(/\s+/);
      const orderNumber = parts[1];
      if (!orderNumber) {
        await safeNotify(chatId, 'Usage: /order PV-ORD-12345');
        return NextResponse.json({ ok: true });
      }

      const linked = await findTelegramAdminByChat(String(chatId));
      if (!linked || linked.status !== 'ACTIVE' || (linked.telegramUserId && linked.telegramUserId !== String(message.from?.id || ''))) {
        await safeNotify(chatId, 'You are not authorized to use this bot.');
        return NextResponse.json({ ok: true });
      }

      const appUser = await getUserById(linked.userId);
      if (!appUser || !AuthorizationService.canAccess(appUser.role, 'telegram.viewOrders')) {
        await safeNotify(chatId, 'You are not authorized to view orders.');
        return NextResponse.json({ ok: true });
      }

      const order = await findOrderByOrderNumber(orderNumber);
      if (!order) {
        await safeNotify(chatId, `Order not found: ${orderNumber}`);
        return NextResponse.json({ ok: true });
      }

      await sendOrderDetails(chatId, order, AuthorizationService.canAccess(appUser.role, 'telegram.manageOrders'));
      return NextResponse.json({ ok: true });
    }

    // Order search command: /orders <term>
    if (typeof text === 'string' && text.startsWith('/orders')) {
      const parts = text.split(/\s+/);
      const term = parts.slice(1).join(' ');
      if (!term) {
        await safeNotify(chatId, 'Usage: /orders <order number|customer name|mobile>');
        return NextResponse.json({ ok: true });
      }

      const linked = await findTelegramAdminByChat(String(chatId));
      if (!linked || linked.status !== 'ACTIVE' || (linked.telegramUserId && linked.telegramUserId !== String(message.from?.id || ''))) {
        await safeNotify(chatId, 'You are not authorized to use this bot.');
        return NextResponse.json({ ok: true });
      }

      const appUser = await getUserById(linked.userId);
      if (!appUser || !AuthorizationService.canAccess(appUser.role, 'telegram.viewOrders')) {
        await safeNotify(chatId, 'You are not authorized to search orders.');
        return NextResponse.json({ ok: true });
      }

      const results = await searchOrders(term);
      if (!results.length) {
        await safeNotify(chatId, `No orders found for '${term}'.`);
        return NextResponse.json({ ok: true });
      }

      const restaurantName = await getRestaurantName();
      const lines: string[] = [`*${markdownEscape(restaurantName)} Order Search Results*`, ''];
      const keyboard: Array<Array<Record<string, string>>> = [];
      results.slice(0, 10).forEach((order) => {
        lines.push(`${markdownEscape(order.orderNumber)} — ${markdownEscape(order.customerSnapshot.name || 'Unknown')} — ${markdownEscape(order.orderStatus)}`);
        keyboard.push([{ text: order.orderNumber, callback_data: `order:view:${order.orderNumber}` }]);
      });
      await safeNotify(chatId, lines.join('\n'), { reply_markup: { inline_keyboard: keyboard }, disable_web_page_preview: true });
      return NextResponse.json({ ok: true });
    }

    // Booking lookup command: /booking <BOOKING_NUMBER>
    if (typeof text === 'string' && text.startsWith('/booking')) {
      const parts = text.split(/\s+/);
      const bookingNumber = parts[1];
      if (!bookingNumber) {
        await safeNotify(chatId, 'Usage: /booking PV-BK-2026-000001');
        return NextResponse.json({ ok: true });
      }

      const linked = await findTelegramAdminByChat(String(chatId));
      if (!linked || linked.status !== 'ACTIVE' || (linked.telegramUserId && linked.telegramUserId !== String(message.from?.id || ''))) {
        await safeNotify(chatId, 'You are not authorized to use this bot.');
        return NextResponse.json({ ok: true });
      }

      const appUser = await getUserById(linked.userId);
      if (!appUser || !AuthorizationService.canAccess(appUser.role, 'telegram.viewBookings')) {
        await safeNotify(chatId, 'You are not authorized to view bookings.');
        return NextResponse.json({ ok: true });
      }

      const booking = await findDiningBookingByBookingNumber(bookingNumber);
      if (!booking) {
        await safeNotify(chatId, `Booking not found: ${bookingNumber}`);
        return NextResponse.json({ ok: true });
      }

      await sendBookingDetails(chatId, booking, AuthorizationService.canAccess(appUser.role, 'telegram.manageBookings'));
      return NextResponse.json({ ok: true });
    }

    // Booking search command: /bookings <term>
    if (typeof text === 'string' && text.startsWith('/bookings')) {
      const parts = text.split(/\s+/);
      const term = parts.slice(1).join(' ');
      if (!term) {
        await safeNotify(chatId, 'Usage: /bookings <booking number|customer name|mobile>');
        return NextResponse.json({ ok: true });
      }

      const linked = await findTelegramAdminByChat(String(chatId));
      if (!linked || linked.status !== 'ACTIVE' || (linked.telegramUserId && linked.telegramUserId !== String(message.from?.id || ''))) {
        await safeNotify(chatId, 'You are not authorized to use this bot.');
        return NextResponse.json({ ok: true });
      }

      const appUser = await getUserById(linked.userId);
      if (!appUser || !AuthorizationService.canAccess(appUser.role, 'telegram.viewBookings')) {
        await safeNotify(chatId, 'You are not authorized to search bookings.');
        return NextResponse.json({ ok: true });
      }

      const results = await searchDiningBookings(term);
      if (!results.length) {
        await safeNotify(chatId, `No bookings found for '${term}'.`);
        return NextResponse.json({ ok: true });
      }

      const restaurantName = await getRestaurantName();
      const lines: string[] = [`*${markdownEscape(restaurantName)} Booking Search Results*`, ''];
      const keyboard: Array<Array<Record<string, string>>> = [];
      results.slice(0, 10).forEach((booking) => {
        lines.push(`${markdownEscape(booking.bookingNumber)} — ${markdownEscape(booking.customerSnapshot.name || 'Unknown')} — ${markdownEscape(booking.bookingStatus)}`);
        keyboard.push([{ text: booking.bookingNumber, callback_data: `booking:view:${booking.bookingNumber}` }]);
      });
      await safeNotify(chatId, lines.join('\n'), { reply_markup: { inline_keyboard: keyboard }, disable_web_page_preview: true });
      return NextResponse.json({ ok: true });
    }

    // Other commands: /start, /help
    if (typeof text === 'string' && (text.startsWith('/start') || text.startsWith('/help'))) {
      const help = `${await getRestaurantName()} Admin Bot\nCommands:\n/start, /help - show this message\n/link <code> - link your Telegram chat (one-time code)\n/order <ORDER_NUMBER> - lookup order\n/orders <term> - search orders\n/assign <ORDER_NUMBER> <STAFF_ID> - assign delivery\n/booking <BOOKING_NUMBER> - lookup booking\n/bookings <term> - search bookings`;
      await safeNotify(chatId, help);
      return NextResponse.json({ ok: true });
    }

    // Unhandled: respond generically
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
