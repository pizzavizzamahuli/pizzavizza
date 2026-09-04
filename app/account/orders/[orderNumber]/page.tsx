import { getSessionUser } from '@/src/auth/session';
import { findOrderByOrderNumber } from '@/src/models/order';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { notFound } from 'next/navigation';
import OrderReceiptView from '@/src/components/account/order-receipt-view';

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return notFound();
  const { orderNumber } = await params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order || order.userId !== user._id!.toHexString()) return notFound();
  const settings = await getRestaurantSettings();
  return <OrderReceiptView order={order} settings={settings} />;
}
