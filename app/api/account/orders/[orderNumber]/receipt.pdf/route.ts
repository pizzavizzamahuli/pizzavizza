import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getSessionUser } from '@/src/auth/session';
import { findOrderByOrderNumber } from '@/src/models/order';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

function line(pdfPage: import('pdf-lib').PDFPage, font: import('pdf-lib').PDFFont, value: string, x: number, y: number, size = 10, color = rgb(0.12, 0.1, 0.09)) { pdfPage.drawText(value.slice(0, 110), { x, y, size, font, color }); }

export async function GET(_request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { orderNumber } = await context.params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order || order.userId !== user._id?.toHexString()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const settings = await getRestaurantSettings();
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 790;
  line(page, bold, settings.restaurantName || 'Pizza Vizza', 42, y, 20); y -= 28; line(page, font, [settings.addressLine1, settings.city, settings.state, settings.postalCode].filter(Boolean).join(', '), 42, y); y -= 16; line(page, font, [settings.phone, settings.email].filter(Boolean).join(' · '), 42, y); y -= 34; line(page, bold, 'ORDER RECEIPT', 42, y, 15); y -= 24; line(page, font, `Order: ${order.orderNumber}`, 42, y); line(page, font, `Type: ${order.fulfillmentType}`, 330, y); y -= 16; line(page, font, `Date: ${order.createdAt.toLocaleDateString()} ${order.createdAt.toLocaleTimeString()}`, 42, y); y -= 28; line(page, bold, `Customer: ${order.customerSnapshot.name}`, 42, y); y -= 24;
  for (const item of order.items) { if (y < 90) { page = pdf.addPage([595, 842]); y = 790; } line(page, font, `${item.quantity} x ${item.name}`, 42, y); line(page, font, `INR ${item.subtotal.toFixed(2)}`, 450, y, 10); y -= 15; for (const option of item.selectedOptions || []) { line(page, font, `+ ${option.groupName}: ${option.optionName} (INR ${option.price.toFixed(2)})`, 58, y, 8, rgb(0.35, 0.33, 0.31)); y -= 12; } y -= 5; }
  y -= 12; page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 1, color: rgb(0.8, 0.78, 0.75) }); y -= 22; const totals: Array<[string, number]> = [['Subtotal', order.subtotal], ['Discount', -order.discount], ['Wallet Used', -order.walletAmount], ['Delivery Charge', order.deliveryCharge], ['Other Charges', order.additionalCharges], ['Grand Total', order.totalAmount]]; for (const [label, amount] of totals) { line(page, label === 'Grand Total' ? bold : font, label, 330, y, label === 'Grand Total' ? 12 : 10); line(page, label === 'Grand Total' ? bold : font, `INR ${amount.toFixed(2)}`, 470, y, label === 'Grand Total' ? 12 : 10); y -= label === 'Grand Total' ? 24 : 17; }
  y -= 10; line(page, bold, `Payment: ${order.paymentMethod || 'Not specified'} / ${order.paymentStatus}`, 42, y); y -= 17; line(page, font, `Paid: INR ${Number(order.paidAmount ?? (order.paymentStatus === 'PAID' ? order.totalAmount : 0)).toFixed(2)}   Due: INR ${Number(order.amountDue ?? (order.paymentStatus === 'PAID' ? 0 : order.totalAmount)).toFixed(2)}`, 42, y); if (order.transactionId) { y -= 17; line(page, font, `Transaction ID: ${order.transactionId}`, 42, y); } if (order.deliveryAddress) { y -= 28; line(page, bold, 'Delivery Address', 42, y); y -= 17; line(page, font, `${order.deliveryAddress.addressLine1}${order.deliveryAddress.landmark ? `, ${order.deliveryAddress.landmark}` : ''}`, 42, y); y -= 17; line(page, font, `${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.postalCode}`, 42, y); } y -= 35; line(page, font, 'Thank you for ordering from Pizza Vizza!', 42, y, 10, rgb(0.35, 0.33, 0.31));
  const bytes = await pdf.save(); return new NextResponse(bytes as unknown as BodyInit, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${order.orderNumber}-receipt.pdf"`, 'Cache-Control': 'private, no-store' } });
}
