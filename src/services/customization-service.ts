import { ProductDocument } from '@/src/models/product';
import { CustomizationGroupDocument, findCustomizationGroupsByIds } from '@/src/models/customization-group';

export interface SelectedCustomizationOptionPayload {
  optionId: string;
}

export interface CartItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface CustomizationCalculationResult {
  selectedOptions: CartItemOption[];
  customizationTotal: number;
}

export function buildCartItemKey(productId: string, selectedOptionIds?: string[]) {
  const normalized = (selectedOptionIds || []).filter(Boolean).map((id) => id.trim()).sort();
  if (normalized.length === 0) return productId;
  return `${productId}:${normalized.join(',')}`;
}

export async function calculateCustomizationForProduct(product: ProductDocument, selectedOptionIds: string[] = []): Promise<CustomizationCalculationResult> {
  const normalizedSelectedIds = Array.from(new Set((selectedOptionIds || []).filter((id) => typeof id === 'string' && id.trim() !== '').map((id) => id.trim())));
  if (!product.customizationGroupIds || product.customizationGroupIds.length === 0) {
    if (normalizedSelectedIds.length > 0) {
      throw new Error('This product does not support customization options');
    }
    return { selectedOptions: [], customizationTotal: 0 };
  }

  const groups = await findCustomizationGroupsByIds(product.customizationGroupIds || []);
  if (groups.length !== product.customizationGroupIds.length) {
    throw new Error('One or more customization groups are unavailable for this product');
  }

  const activeGroups = groups.filter((group) => group.isActive !== false);
  const selectedOptions: CartItemOption[] = [];
  const selectedByGroup: Record<string, CartItemOption[]> = {};

  const optionLookup = new Map<string, { group: CustomizationGroupDocument; option: { id: string; name: string; price: number; isActive?: boolean } }>();
  for (const group of activeGroups) {
    for (const option of group.options || []) {
      optionLookup.set(option.id, { group, option });
    }
  }

  for (const optionId of normalizedSelectedIds) {
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
      price: option.price,
    };
    selectedOptions.push(opt);
    selectedByGroup[group.id || ''] = selectedByGroup[group.id || ''] || [];
    selectedByGroup[group.id || ''].push(opt);
  }

  for (const group of activeGroups) {
    const selectedForGroup = selectedByGroup[group.id || ''] || [];
    const count = selectedForGroup.length;
    if (group.required && count === 0) {
      throw new Error(`Please select at least one option for ${group.name}`);
    }
    if (group.minSelections != null && count < group.minSelections) {
      throw new Error(`Please select at least ${group.minSelections} option(s) for ${group.name}`);
    }
    if (group.maxSelections != null && count > group.maxSelections) {
      throw new Error(`You can select at most ${group.maxSelections} option(s) for ${group.name}`);
    }
  }

  const customizationTotal = selectedOptions.reduce((sum, it) => sum + it.price, 0);
  return { selectedOptions, customizationTotal };
}

export function getEffectiveProductPrice(product: ProductDocument) {
  return typeof product.discountPrice === 'number' && product.discountPrice >= 0 ? product.discountPrice : product.price;
}
