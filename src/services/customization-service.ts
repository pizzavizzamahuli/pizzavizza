import { ProductDocument } from '@/src/models/product';
import { CustomizationGroupDocument, findCustomizationGroupsByIds } from '@/src/models/customization-group';

export interface SelectedCustomizationOptionPayload {
  optionId: string;
  quantity?: number;
}

export interface CartItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
  quantity?: number;
  groupType?: string;
  defaultIncluded?: boolean;
  included?: boolean;
  removable?: boolean;
}

export type CustomizationSelection = string[] | SelectedCustomizationOptionPayload[];

export interface CustomizationCalculationResult {
  selectedOptions: CartItemOption[];
  customizationTotal: number;
  selectedSize?: { optionId: string; name: string; price: number } | null;
  removedToppings?: Array<{ optionId: string; name: string; price: number }>;
  addedExtras?: Array<{ optionId: string; name: string; price: number; quantity: number }>;
}

export function buildCartItemKey(productId: string, selectedOptionIds?: CustomizationSelection) {
  const normalized = normalizeSelections(selectedOptionIds).map((selection) => `${selection.optionId}:${selection.quantity}`).sort();
  if (normalized.length === 0) return productId;
  return `${productId}:${normalized.join(',')}`;
}

function normalizeSelections(selections: CustomizationSelection = []) {
  const values = Array.isArray(selections) ? selections : [];
  const normalized = values.map((value) => typeof value === 'string' ? { optionId: value, quantity: 1 } : { optionId: String(value.optionId || ''), quantity: Math.max(1, Math.floor(Number(value.quantity || 1))) }).filter((value) => value.optionId);
  const byId = new Map<string, { optionId: string; quantity: number }>();
  for (const value of normalized) byId.set(value.optionId, { optionId: value.optionId, quantity: (byId.get(value.optionId)?.quantity || 0) + value.quantity });
  return [...byId.values()];
}

export async function calculateCustomizationForProduct(product: ProductDocument, selections: CustomizationSelection = []): Promise<CustomizationCalculationResult> {
  const normalizedSelections = normalizeSelections(selections);
  const normalizedSelectedIds = normalizedSelections.map((selection) => selection.optionId);
  if (!product.customizationGroupIds || product.customizationGroupIds.length === 0) {
    if (normalizedSelectedIds.length > 0) {
      throw new Error('This product does not support customization options');
    }
    return { selectedOptions: [], customizationTotal: 0, selectedSize: null, removedToppings: [], addedExtras: [] };
  }

  const groups = await findCustomizationGroupsByIds(product.customizationGroupIds || []);
  if (groups.length !== product.customizationGroupIds.length) {
    throw new Error('One or more customization groups are unavailable for this product');
  }

  const activeGroups = groups.filter((group) => group.isActive !== false);
  const lockedIncludedIds = activeGroups.flatMap((group) => group.groupType === 'TOPPINGS' ? (group.options || []).filter((option) => option.isActive !== false && (option.defaultIncluded === true || option.included === true) && option.removable !== true).map((option) => option.id) : []);
  for (const optionId of lockedIncludedIds) {
    if (!normalizedSelectedIds.includes(optionId)) normalizedSelections.push({ optionId, quantity: 1 });
  }
  const selectedOptions: CartItemOption[] = [];
  const selectedByGroup: Record<string, CartItemOption[]> = {};

  const optionLookup = new Map<string, { group: CustomizationGroupDocument; option: { id: string; name: string; price: number; isActive?: boolean; defaultIncluded?: boolean; included?: boolean; removable?: boolean } }>();
  for (const group of activeGroups) {
    for (const option of group.options || []) {
      optionLookup.set(option.id, { group, option });
    }
  }

  for (const selection of normalizedSelections) {
    const optionId = selection.optionId;
    const resolved = optionLookup.get(optionId);
    if (!resolved) {
      throw new Error(`Selected customization option ${optionId} is not valid for this product`);
    }
    const { group, option } = resolved;
    if (option.isActive === false) {
      throw new Error(`Selected option ${option.name} is no longer available`);
    }
    const opt: CartItemOption = {
      groupId: group.id || '',
      groupName: group.name,
      optionId: option.id,
      optionName: option.name,
      price: group.groupType === 'TOPPINGS' && option.defaultIncluded ? 0 : option.price,
      quantity: selection.quantity,
      groupType: group.groupType,
      defaultIncluded: option.defaultIncluded === true,
      included: option.included === true || option.defaultIncluded === true,
      removable: option.removable === true,
    };
    selectedOptions.push(opt);
    selectedByGroup[group.id || ''] = selectedByGroup[group.id || ''] || [];
    selectedByGroup[group.id || ''].push(opt);
  }

  for (const group of activeGroups) {
    const selectedForGroup = selectedByGroup[group.id || ''] || [];
    const count = selectedForGroup.length;
    if (group.required && count === 0 && group.minSelections != null && group.minSelections > 0) {
      throw new Error(`Please select at least one option for ${group.name}`);
    }
    if (group.minSelections != null && group.minSelections > 0 && count < group.minSelections) {
      throw new Error(`Please select at least ${group.minSelections} option(s) for ${group.name}`);
    }
    if (group.maxSelections != null && count > group.maxSelections) {
      throw new Error(`You can select at most ${group.maxSelections} option(s) for ${group.name}`);
    }
  }

  const sizeGroup = activeGroups.find((group) => group.groupType === 'SIZE');
  const selectedSizeOption = sizeGroup ? (selectedByGroup[sizeGroup.id || ''] || [])[0] : undefined;
  const selectedSize = selectedSizeOption ? { optionId: selectedSizeOption.optionId, name: selectedSizeOption.optionName, price: selectedSizeOption.price } : null;
  const removedToppings = activeGroups.filter((group) => group.groupType === 'TOPPINGS').flatMap((group) => (group.options || []).filter((option) => option.isActive !== false && (option.defaultIncluded === true || option.included === true) && option.removable === true && !normalizedSelectedIds.includes(option.id)).map((option) => ({ optionId: option.id, name: option.name, price: option.price })));
  const addedExtras = selectedOptions.filter((option) => option.groupType === 'EXTRAS').map((option) => ({ optionId: option.optionId, name: option.optionName, price: option.price, quantity: option.quantity || 1 }));
  const sizeAdjustment = selectedSize ? selectedSize.price - getEffectiveProductPrice(product) : 0;
  const toppingAdjustment = removedToppings.reduce((sum, topping) => sum - topping.price, 0);
  const extraAdjustment = addedExtras.reduce((sum, extra) => sum + extra.price * extra.quantity, 0);
  const otherAdjustment = selectedOptions.filter((option) => !['SIZE', 'TOPPINGS', 'EXTRAS'].includes(option.groupType || '')).reduce((sum, option) => sum + option.price * (option.quantity || 1), 0);
  return { selectedOptions, customizationTotal: sizeAdjustment + toppingAdjustment + extraAdjustment + otherAdjustment, selectedSize, removedToppings, addedExtras };
}

export function getEffectiveProductPrice(product: ProductDocument) {
  return typeof product.discountPrice === 'number' && product.discountPrice >= 0 ? product.discountPrice : product.price;
}
