import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { calculateOrderTotals } from '@/src/services/order-service';
import { findOrderByOrderNumber, updateOrderByOrderNumber } from '@/src/models/order';

export async function POST(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'orders.manage', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { orderNumber } = await context.params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.orderStatus)) return NextResponse.json({ error: 'This order cannot be amended.' }, { status: 409 });
  try {
    const body = await request.json() as { items?: Array<{ productId: string; quantity: number; selectedOptionIds?: string[] }> };
    if (!Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: 'Items are required.' }, { status: 400 });
    const added = await calculateOrderTotals(body.items);
    const items = [...order.items, ...added.itemSnapshots];
    const subtotal = Number((order.subtotal + added.subtotal).toFixed(2));
    const totalAmount = Number(Math.max(0, subtotal + order.deliveryCharge + order.additionalCharges - order.discount - order.walletAmount).toFixed(2));
    const paidAmount = Math.min(order.paidAmount ?? (order.paymentStatus === 'PAID' ? order.totalAmount : 0), totalAmount);
    const amountDue = Number(Math.max(0, totalAmount - paidAmount).toFixed(2));
    const updated = await updateOrderByOrderNumber(orderNumber, { items, subtotal, totalAmount, paidAmount, amountDue, paymentStatus: amountDue > 0 && order.paymentStatus === 'PAID' ? 'PENDING' : order.paymentStatus, statusHistory: [...(order.statusHistory || []), { previousStatus: order.orderStatus, newStatus: order.orderStatus, changedBy: user._id?.toHexString(), note: `Added ${added.itemSnapshots.length} item(s) by ${user.name}; amount due INR ${amountDue.toFixed(2)}`, createdAt: new Date() }] });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to amend order.' }, { status: 400 }); }
}
