import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findOrderByOrderNumber, PaymentStatus, updateOrderByOrderNumber } from '@/src/models/order';
import { recordTelegramAudit } from '@/src/models/telegram-audit';
import { notifyAdmins, notifyUser } from '@/src/services/notification-service';
import { recordAudit } from '@/src/models/audit-log';
import { isOrderPaymentCleared } from '@/src/services/payment-service';

const allowedPaymentStatuses: PaymentStatus[] = ['PENDING', 'AWAITING_VERIFICATION', 'PAID', 'FAILED', 'SUSPICIOUS', 'REFUNDED'];

export async function PUT(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'payments.manage', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orderNumber } = await context.params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const status = typeof payload.paymentStatus === 'string' ? payload.paymentStatus.trim().toUpperCase() : '';
    if (!allowedPaymentStatuses.includes(status as PaymentStatus)) {
      return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
    }
    if (status === 'PAID' && order.paymentMethod === 'MANUAL' && (!order.paymentProofUrl || !order.transactionId)) {
      return NextResponse.json({ error: 'Manual payment requires proof image and transaction ID before verification.' }, { status: 409 });
    }

    const staffDiscountGiven = typeof payload.staffDiscountGiven === 'boolean' ? payload.staffDiscountGiven : undefined;
    const staffDiscountAmount = typeof payload.staffDiscountAmount === 'number' && Number.isFinite(payload.staffDiscountAmount) ? Math.max(0, payload.staffDiscountAmount) : undefined;
    const staffDiscountReason = typeof payload.staffDiscountReason === 'string' ? payload.staffDiscountReason.trim().slice(0, 500) : undefined;

    const paidAmount = status === 'PAID' ? Number(order.totalAmount || 0) : order.paymentStatus === 'PAID' ? Number(order.paidAmount ?? (order.totalAmount || 0)) : 0;
    const amountDue = status === 'PAID' ? 0 : Number(order.totalAmount || 0);

    const updated = await updateOrderByOrderNumber(order.orderNumber, {
      paymentStatus: status as PaymentStatus,
      paidAmount,
      amountDue,
      ...(staffDiscountGiven !== undefined ? { staffDiscountGiven, staffDiscountAmount: staffDiscountGiven ? staffDiscountAmount || 0 : 0, staffDiscountReason: staffDiscountGiven ? staffDiscountReason || null : null } : {}),
    });
    if (updated) {
      const eventKey = `order:${updated.orderNumber}:payment:${status.toLowerCase()}`;
      notifyUser(updated.userId, { type: `PAYMENT_${status}`, title: `Payment ${status.toLowerCase()}`, message: `Payment for order ${updated.orderNumber} is ${status.toLowerCase()}.`, href: `/account/orders/${updated.orderNumber}`, relatedType: 'order', relatedId: updated.orderNumber, eventKey }).catch((error) => console.error('Payment notification failed', error));
      if (status !== 'PAID') notifyAdmins({ type: `PAYMENT_${status}`, title: `Payment ${status.toLowerCase()}`, message: `Payment for order ${updated.orderNumber} requires attention.`, href: `/admin/orders/${updated.orderNumber}`, relatedType: 'order', relatedId: updated.orderNumber, permission: 'payments.view', eventKey: `admin:${eventKey}` }).catch((error) => console.error('Admin payment notification failed', error));
      if (status === 'PAID' && updated.fulfillmentType === 'DELIVERY' && updated.orderStatus === 'READY' && isOrderPaymentCleared(updated.paymentMethod, updated.paymentStatus)) {
        const { autoAssignDeliveryStaff } = await import('@/src/services/delivery-assignment-service');
        autoAssignDeliveryStaff(updated.orderNumber).catch((error) => console.error('Automatic delivery assignment after payment failed', error));
      }
    }
    await recordTelegramAudit({
      performedByUserId: user._id?.toHexString() || null,
      telegramUserId: null,
      action: status === 'PAID' ? 'payment_verified' : status === 'FAILED' ? 'payment_rejected' : status === 'SUSPICIOUS' ? 'payment_marked_suspicious' : 'payment_status_updated',
      targetType: 'order',
      targetId: order.orderNumber,
      payload: { previousStatus: order.paymentStatus, newStatus: status, source: 'admin_panel' },
      timestamp: new Date(),
    });
    await recordAudit({ type: `ORDER_PAYMENT_${status}`, performedBy: user._id?.toHexString() || user.email, oldValue: { paymentStatus: order.paymentStatus }, newValue: { paymentStatus: status, orderNumber: order.orderNumber }, timestamp: new Date() });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update payment status';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
