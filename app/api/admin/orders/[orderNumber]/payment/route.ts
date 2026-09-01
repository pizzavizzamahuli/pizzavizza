import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findOrderByOrderNumber, PaymentStatus, updateOrderByOrderNumber } from '@/src/models/order';
import { recordTelegramAudit } from '@/src/models/telegram-audit';

const allowedPaymentStatuses: PaymentStatus[] = ['PENDING', 'AWAITING_VERIFICATION', 'PAID', 'FAILED', 'REFUNDED'];

export async function PUT(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'payments.manage')) {
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

    const updated = await updateOrderByOrderNumber(order.orderNumber, { paymentStatus: status as PaymentStatus });
    await recordTelegramAudit({
      performedByUserId: user._id?.toHexString() || null,
      telegramUserId: null,
      action: status === 'PAID' ? 'payment_verified' : status === 'FAILED' ? 'payment_rejected' : 'payment_status_updated',
      targetType: 'order',
      targetId: order.orderNumber,
      payload: { previousStatus: order.paymentStatus, newStatus: status, source: 'admin_panel' },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update payment status';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
