import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getSessionUser } from '@/src/auth/session';
import { findOrderByOrderNumber } from '@/src/models/order';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

function money(value: number) {
  return `INR ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} • ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

function splitLines(value: string, maxLength = 64) {
  const chunks: string[] = [];
  const words = value.split(/\s+/).filter(Boolean);
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxLength) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [''];
}

async function loadReceiptLogo(settingsLogo?: string | null) {
  const logo = settingsLogo?.trim();
  if (!logo) return null;

  try {
    const remoteUrl = /^https?:\/\//i.test(logo) ? logo : new URL(logo, 'http://localhost:3000').toString();
    const response = await fetch(remoteUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Logo fetch failed with status ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const isPng = buffer.subarray(0, 8).toString('hex').startsWith('89504e470d0a1a0a');
    if (isPng) return { type: 'png' as const, buffer };
    const isJpg = buffer.subarray(0, 2).toString('hex') === 'ffd8';
    if (isJpg) return { type: 'jpg' as const, buffer };
    return null;
  } catch (error) {
    console.error('Receipt logo load failed', { logo, error: error instanceof Error ? error.message : error });
    return null;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { orderNumber } = await context.params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order || order.userId !== user._id?.toHexString()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const settings = await getRestaurantSettings();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const orderDate = formatDateTime(order.createdAt);
  const restaurantName = settings.restaurantName || 'Pizza Vizza';
  const restaurantAddress = [settings.addressLine1, settings.city, settings.state, settings.postalCode].filter(Boolean).join(', ') || 'Pizza Vizza';
  const contactLine = [settings.phone, settings.email].filter(Boolean).join(' • ') || 'Thank you for ordering with us';
  const paidAmount = Number(order.paidAmount ?? (order.paymentStatus === 'PAID' ? order.totalAmount : 0));
  const amountDue = Number(order.amountDue ?? (order.paymentStatus === 'PAID' ? 0 : order.totalAmount));

  let y = 780;
  const logoAsset = await loadReceiptLogo(settings.logo);
  if (logoAsset) {
    const image = logoAsset.type === 'png' ? await pdf.embedPng(logoAsset.buffer) : await pdf.embedJpg(logoAsset.buffer);
    const logoSize = 42;
    page.drawImage(image, { x: 44, y: 772, width: logoSize, height: logoSize });
  } else {
    page.drawRectangle({ x: 44, y: 772, width: 42, height: 42, color: rgb(0.99, 0.74, 0.06) });
    page.drawText('PV', { x: 57, y: 784, size: 14, font: bold, color: rgb(1, 1, 1) });
  }

  page.drawText(restaurantName, { x: 100, y: 799, size: 18, font: bold, color: rgb(0.12, 0.1, 0.09) });
  page.drawText(restaurantAddress, { x: 100, y: 783, size: 8, font, color: rgb(0.42, 0.4, 0.36) });
  page.drawText(contactLine, { x: 100, y: 771, size: 8, font, color: rgb(0.42, 0.4, 0.36) });

  y = 742;
  page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 1, color: rgb(0.88, 0.86, 0.83) });
  y -= 18;
  page.drawText('ORDER RECEIPT', { x: 42, y, size: 16, font: bold, color: rgb(0.12, 0.1, 0.09) });
  y -= 20;
  page.drawText(`Order #${order.orderNumber}`, { x: 42, y, size: 10, font, color: rgb(0.12, 0.1, 0.09) });
  page.drawText(order.fulfillmentType, { x: 420, y, size: 10, font, color: rgb(0.12, 0.1, 0.09) });
  y -= 16;
  page.drawText(orderDate, { x: 42, y, size: 9, font, color: rgb(0.42, 0.4, 0.36) });
  y -= 16;
  page.drawText(`Customer: ${order.customerSnapshot?.name || 'Customer'}`, { x: 42, y, size: 10, font: bold, color: rgb(0.12, 0.1, 0.09) });
  if (order.customerSnapshot?.mobile) {
    y -= 14;
    page.drawText(`Mobile: ${order.customerSnapshot.mobile}`, { x: 42, y, size: 9, font, color: rgb(0.42, 0.4, 0.36) });
  }

  y -= 22;
  page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 1, color: rgb(0.88, 0.86, 0.83) });
  y -= 16;
  page.drawText('ITEMS', { x: 42, y, size: 10, font: bold, color: rgb(0.12, 0.1, 0.09) });

  const itemStartY = y - 10;
  let itemY = itemStartY;
  for (const item of order.items || []) {
    if (itemY < 170) {
      break;
    }
    const optionLines = item.selectedOptions?.length ? item.selectedOptions.map((option) => `+ ${option.groupName}: ${option.optionName}`) : [];
    page.drawText(`${item.quantity} × ${item.name}`, { x: 42, y: itemY, size: 10, font, color: rgb(0.12, 0.1, 0.09) });
    page.drawText(money(item.subtotal), { x: 500, y: itemY, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
    itemY -= 14;
    for (const optionLine of optionLines) {
      page.drawText(optionLine, { x: 58, y: itemY, size: 8, font, color: rgb(0.42, 0.4, 0.36) });
      itemY -= 12;
    }
    itemY -= 6;
  }

  y = Math.min(y, itemY + 28);
  y -= 6;
  page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 1, color: rgb(0.88, 0.86, 0.83) });
  y -= 18;
  page.drawText('Subtotal', { x: 360, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  page.drawText(money(order.subtotal), { x: 500, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  y -= 14;
  page.drawText('Discount', { x: 360, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  page.drawText(money(-order.discount), { x: 500, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  y -= 14;
  page.drawText('Wallet used', { x: 360, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  page.drawText(money(-order.walletAmount), { x: 500, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  y -= 14;
  page.drawText('Delivery charge', { x: 360, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  page.drawText(money(order.deliveryCharge), { x: 500, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  y -= 14;
  page.drawText('Other charges', { x: 360, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  page.drawText(money(order.additionalCharges), { x: 500, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  y -= 20;
  page.drawLine({ start: { x: 360, y }, end: { x: 553, y }, thickness: 1, color: rgb(0.88, 0.86, 0.83) });
  y -= 18;
  page.drawText('TOTAL', { x: 360, y, size: 11, font: bold, color: rgb(0.12, 0.1, 0.09) });
  page.drawText(money(order.totalAmount), { x: 500, y, size: 11, font: bold, color: rgb(0.12, 0.1, 0.09) });

  y -= 26;
  page.drawText('PAYMENT', { x: 42, y, size: 10, font: bold, color: rgb(0.12, 0.1, 0.09) });
  y -= 16;
  page.drawText(`${order.paymentMethod || 'Not specified'} • ${order.paymentStatus}`, { x: 42, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  y -= 14;
  page.drawText(`Paid: ${money(paidAmount)}    Due: ${money(amountDue)}`, { x: 42, y, size: 9, font, color: rgb(0.12, 0.1, 0.09) });
  if (order.transactionId) {
    y -= 14;
    page.drawText(`Transaction ID: ${order.transactionId}`, { x: 42, y, size: 8, font, color: rgb(0.42, 0.4, 0.36) });
  }

  if (order.deliveryAddress) {
    y -= 24;
    page.drawText('DELIVERY', { x: 42, y, size: 10, font: bold, color: rgb(0.12, 0.1, 0.09) });
    y -= 14;
    const deliveryLines = [`${order.deliveryAddress.addressLine1 || ''}${order.deliveryAddress.landmark ? `, ${order.deliveryAddress.landmark}` : ''}`, `${order.deliveryAddress.city || ''}, ${order.deliveryAddress.state || ''} ${order.deliveryAddress.postalCode || ''}`].flatMap((line) => splitLines(line || '', 42));
    for (const deliveryLine of deliveryLines) {
      if (y < 74) break;
      page.drawText(deliveryLine, { x: 42, y, size: 8, font, color: rgb(0.42, 0.4, 0.36) });
      y -= 10;
    }
  }

  y -= 22;
  page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 1, color: rgb(0.88, 0.86, 0.83) });
  y -= 16;
  page.drawText('Thank you for ordering from Pizza Vizza!', { x: 42, y, size: 9, font, color: rgb(0.42, 0.4, 0.36) });

  const bytes = await pdf.save();
  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${order.orderNumber}-receipt.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
