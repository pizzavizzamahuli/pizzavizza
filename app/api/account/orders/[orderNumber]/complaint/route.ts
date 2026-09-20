import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { findOrderByOrderNumber, updateOrderByOrderNumber } from '@/src/models/order';

export async function POST(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { orderNumber } = await context.params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  if (order.userId !== user._id?.toHexString() && order.userId !== user.id) {
    return NextResponse.json({ error: 'You can only submit complaints for your own orders.' }, { status: 403 });
  }

  const completionEntry = (order.statusHistory || []).find((entry) => entry.newStatus === 'COMPLETED');
  const completionTimestamp = completionEntry?.createdAt ? new Date(completionEntry.createdAt).getTime() : new Date(order.updatedAt).getTime();
  const complaintWindowMs = 10 * 60 * 1000;

  if (order.orderStatus !== 'COMPLETED' || Date.now() - completionTimestamp > complaintWindowMs) {
    return NextResponse.json({ error: 'Complaints are only available for 10 minutes after an order is completed.' }, { status: 400 });
  }

  const payload = await request.json();
  const category = typeof payload.category === 'string' ? payload.category.trim().slice(0, 100) : '';
  const issueDescription = typeof payload.issueDescription === 'string' ? payload.issueDescription.trim().slice(0, 1000) : '';

  if (!category || !issueDescription) {
    return NextResponse.json({ error: 'Complaint category and issue description are required.' }, { status: 400 });
  }

  const updated = await updateOrderByOrderNumber(order.orderNumber, {
    complaint: {
      category,
      issueDescription,
      submittedAt: new Date(),
      submittedByUserId: user._id?.toHexString() || user.id || order.userId,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
