import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { formatOrderNumber, calculateOrderTotals } from '@/src/services/order-service';
import { createOrder } from '@/src/models/order';
import { findUserByUserCode } from '@/src/models/user';
import { findUserByEmail } from '@/src/services/user-service';
import { getDatabaseClient } from '@/src/config/database';
import { normalizePaymentMethod } from '@/src/services/payment-service';

export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor || !AuthorizationService.canAccess(actor.role, 'orders.manage', actor.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const items = Array.isArray(body.items) ? body.items as Array<{ productId: string; quantity: number; selectedOptionIds?: string[] }> : [];
    if (!items.length) return NextResponse.json({ error: 'At least one item is required.' }, { status: 400 });
    const fulfillmentType = body.fulfillmentType === 'DELIVERY' ? 'DELIVERY' : 'PICKUP';
    const totals = await calculateOrderTotals(items);
    const discount = Math.min(Math.max(0, Number(body.discount || 0)), totals.total);
    const finalTotal = Math.max(0, totals.total - discount);
    const customer = body.userCode ? await findUserByUserCode(String(body.userCode)) : body.email ? await findUserByEmail(String(body.email)) : null;
    const customerName = String(body.customerName || customer?.name || 'Walk-in customer').trim();
    const customerMobile = String(body.customerMobile || customer?.mobile || '').trim() || null;
    const requestedPaidAmount = Number(body.paidAmount ?? 0);
    const paidAmount = Number.isFinite(requestedPaidAmount) ? Math.min(Math.max(0, requestedPaidAmount), finalTotal) : 0;
    const paymentMethod = normalizePaymentMethod(body.paymentMethod || 'COD');
    const paymentStatus = body.paymentStatus === 'PENDING' || paidAmount < finalTotal ? 'PENDING' : 'PAID';
    const client = await getDatabaseClient();
    const session = client.startSession();
    let order;
    try {
      await session.withTransaction(async () => {
        order = await createOrder({ orderNumber: await formatOrderNumber(session), userId: customer?._id?.toHexString() || '', customerSnapshot: { userId: customer?._id?.toHexString() || '', name: customerName, email: customer?.email || null, mobile: customerMobile }, items: totals.itemSnapshots, fulfillmentType, orderSource: 'COUNTER', tableNumber: typeof body.tableNumber === 'string' ? body.tableNumber.trim().slice(0, 30) : null, createdByUserId: actor._id?.toHexString() || null, subtotal: totals.subtotal, deliveryCharge: 0, additionalCharges: 0, discount, walletAmount: 0, totalAmount: finalTotal, paidAmount, amountDue: Math.max(0, finalTotal - paidAmount), paymentMethod, paymentStatus, customerNote: typeof body.customerNote === 'string' ? body.customerNote.trim().slice(0, 500) : null, orderStatus: 'PENDING', statusHistory: [{ newStatus: 'PENDING', changedBy: actor._id?.toHexString(), note: `Counter order created by ${actor.name}`, createdAt: new Date() }], idempotencyKey: typeof body.idempotencyKey === 'string' ? `counter:${body.idempotencyKey}` : null }, session);
      });
    } finally { await session.endSession(); }
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create counter order.' }, { status: 400 });
  }
}
