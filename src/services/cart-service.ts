import { ObjectId } from 'mongodb';
import { CartItem } from '@/src/models/cart';
import { findCartByUserId, updateCartItems, clearCart } from '@/src/models/cart';
import { findProductById, findProductBySlug } from '@/src/models/product';
import { buildCartItemKey, calculateCustomizationForProduct, getEffectiveProductPrice } from '@/src/services/customization-service';

export async function getCartForUser(userId: string) {
  const cart = await findCartByUserId(userId);
  return cart;
}

export async function addToCart(userId: string, productId: string, quantity: number = 1, selectedOptionIds: string[] = []) {
  if (quantity <= 0) throw new Error('Quantity must be > 0');

  const existingCart = await findCartByUserId(userId);
  let product = await findProductById(productId);
  if (!product) {
    // Fallback: allow passing product slug in some flows (smoke tests or external callers)
    product = await findProductBySlug(productId);
  }
  if (!product) throw new Error('Product not found');
  if (!product.isAvailable) throw new Error('Product not available');

  const customization = await calculateCustomizationForProduct(product, selectedOptionIds);
  const basePrice = getEffectiveProductPrice(product);
  const unitPrice = basePrice + customization.customizationTotal;
  const canonicalProductId = product._id instanceof ObjectId ? product._id.toHexString() : product.id || productId;
  const itemKey = buildCartItemKey(canonicalProductId, selectedOptionIds);

  const items = existingCart?.items ? [...existingCart.items] : [];
  const idx = items.findIndex((i) => i.itemKey === itemKey);
  if (idx >= 0) {
    items[idx].quantity = Math.max(1, items[idx].quantity + quantity);
  } else {
    items.push({
      productId: canonicalProductId,
      itemKey,
      name: product.name,
      image: product.image || null,
      unitPrice,
      quantity,
      selectedOptions: customization.selectedOptions,
    });
  }

  return updateCartItems(userId, items);
}

export async function setCartItems(userId: string, items: CartItem[]) {
  const safeItems: CartItem[] = [];
  for (const it of items) {
    if (!it.productId) continue;
    const qty = Math.max(1, Math.floor(it.quantity));
    const product = await findProductById(it.productId);
    if (!product) continue;
    if (!product.isAvailable) continue;
    const selectedOptionIds = it.selectedOptions?.map((opt) => opt.optionId) || [];
    const customization = await calculateCustomizationForProduct(product, selectedOptionIds);
    const basePrice = getEffectiveProductPrice(product);
    safeItems.push({
      productId: it.productId,
      itemKey: buildCartItemKey(it.productId, selectedOptionIds),
      name: product.name,
      image: product.image || null,
      unitPrice: basePrice + customization.customizationTotal,
      quantity: qty,
      selectedOptions: customization.selectedOptions,
    });
  }
  return updateCartItems(userId, safeItems);
}

export async function updateCartItemQuantity(userId: string, itemKey: string, quantity: number) {
  if (quantity <= 0) throw new Error('Quantity must be > 0');
  const existingCart = await findCartByUserId(userId);
  const items = existingCart?.items ? [...existingCart.items] : [];
  const idx = items.findIndex((i) => i.itemKey === itemKey || i.productId === itemKey);
  if (idx === -1) throw new Error('Item not found in cart');
  items[idx].quantity = quantity;
  return updateCartItems(userId, items);
}

export async function removeCartItem(userId: string, itemKey: string) {
  const existingCart = await findCartByUserId(userId);
  const items = existingCart?.items ? existingCart.items.filter((i) => i.itemKey !== itemKey && i.productId !== itemKey) : [];
  if (items.length === 0) {
    await clearCart(userId);
    return null;
  }
  return updateCartItems(userId, items);
}

export async function clearUserCart(userId: string) {
  return clearCart(userId);
}
