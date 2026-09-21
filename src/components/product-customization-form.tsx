'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import AddToCartButton from '@/src/components/add-to-cart-button';
import BuyNowButton from '@/src/components/buy-now-button';
import QuantityControl from '@/src/components/quantity-control';

type CustomizationOption = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isActive?: boolean;
  defaultIncluded?: boolean;
  included?: boolean;
  removable?: boolean;
};

type CustomizationGroup = {
  id: string;
  name: string;
  description?: string | null;
  groupType?: 'SIZE' | 'TOPPINGS' | 'EXTRAS' | 'INCLUDED_TOPPING' | 'EXTRA_ADDON' | 'OTHER';
  required?: boolean;
  minSelections?: number | null;
  maxSelections?: number | null;
  options: CustomizationOption[];
};

type ProductCustomizationFormProps = {
  productId: string;
  groups: CustomizationGroup[];
  basePrice: number;
};

export default function ProductCustomizationForm({ productId, groups, basePrice }: ProductCustomizationFormProps) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => groups.flatMap((group) => {
    if (group.groupType !== 'TOPPINGS' && group.groupType !== 'INCLUDED_TOPPING') return [];
    const zeroPriceOptions = group.options.filter((option) => option.price === 0);
    const defaultOptions = group.options.filter((option) => option.defaultIncluded);
    const selected = [...defaultOptions, ...zeroPriceOptions].filter((option, index, options) => options.findIndex((candidate) => candidate.id === option.id) === index);
    return group.maxSelections === 1 ? selected.slice(0, 1).map((option) => option.id) : selected.map((option) => option.id);
  }));
  const [optionQuantities, setOptionQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const groupSelection = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const group of groups) {
      result[group.id] = group.options.filter((option) => selectedOptionIds.includes(option.id)).map((option) => option.id);
    }
    return result;
  }, [groups, selectedOptionIds]);

  const validationError = useMemo(() => {
    for (const group of groups) {
      const selected = groupSelection[group.id] || [];
      const count = selected.length;
      if (group.required && count === 0 && group.minSelections != null && group.minSelections > 0) {
        return `Please select at least one option for ${group.name}.`;
      }
      if (group.minSelections != null && group.minSelections > 0 && count < group.minSelections) {
        return `Please select at least ${group.minSelections} option(s) for ${group.name}.`;
      }
      if (group.maxSelections != null && count > group.maxSelections) {
        return `You can select at most ${group.maxSelections} option(s) for ${group.name}.`;
      }
    }
    return null;
  }, [groups, groupSelection]);

  const handleSelectOption = (group: CustomizationGroup, optionId: string, checked: boolean) => {
    setMessage(null);
    const selectedForGroup = groupSelection[group.id] || [];
    const isRadio = group.maxSelections === 1;
    const option = group.options.find((candidate) => candidate.id === optionId);
    if (option?.defaultIncluded && option.removable === false && option.price !== 0) return;

    if (isRadio) {
      if (checked) {
        setSelectedOptionIds((current) => [
          ...current.filter((id) => !selectedForGroup.includes(id)),
          optionId,
        ]);
      }
      return;
    }

    if (checked) {
      if (group.maxSelections != null && selectedForGroup.length >= group.maxSelections) {
        return;
      }
      setSelectedOptionIds((current) => Array.from(new Set([...current, optionId])));
      return;
    }

    setSelectedOptionIds((current) => current.filter((id) => id !== optionId));
  };

  const setOptionQuantity = (group: CustomizationGroup, optionId: string, quantity: number) => {
    const nextQuantity = Math.max(0, Math.min(20, quantity));
    setOptionQuantities((current) => ({ ...current, [optionId]: nextQuantity }));
    setSelectedOptionIds((current) => nextQuantity > 0 ? Array.from(new Set([...current, optionId])) : current.filter((id) => id !== optionId));
  };

  const selectedTotal = useMemo(() => {
    const selectedAdjustments = groups.reduce((sum, group) => sum + group.options.filter((option) => selectedOptionIds.includes(option.id)).reduce((groupSum, option) => {
      const quantity = optionQuantities[option.id] || 1;
      if (group.groupType === 'SIZE') return groupSum + option.price - basePrice;
      if (group.groupType === 'TOPPINGS' || group.groupType === 'INCLUDED_TOPPING') return groupSum + (option.defaultIncluded ? 0 : option.price);
      return groupSum + option.price * quantity;
    }, 0), 0);
    const removedIncluded = groups.filter((group) => group.groupType === 'TOPPINGS' || group.groupType === 'INCLUDED_TOPPING').reduce((sum, group) => sum + group.options.filter((option) => option.defaultIncluded && option.removable !== false && !selectedOptionIds.includes(option.id)).reduce((total, option) => total + option.price, 0), 0);
    return selectedAdjustments - removedIncluded;
  }, [groups, selectedOptionIds, optionQuantities, basePrice]);

  const selectedOptions = selectedOptionIds.map((optionId) => ({ optionId, quantity: optionQuantities[optionId] || 1 }));

  return (
    <div className="space-y-6 rounded-3xl border border-stone-200 bg-[#f8f7f4] p-4 shadow-sm sm:p-6">
      <div className="space-y-4">
        <div><div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Customizations</div><p className="mt-1 text-sm text-stone-500">Choose a size, remove toppings, or add extras. Everything updates your total.</p></div>
        {groups.map((group) => {
          const selectedForGroup = groupSelection[group.id] || [];
          const isSingleSelect = group.maxSelections === 1;
          const maxReached = group.maxSelections != null && selectedForGroup.length >= group.maxSelections;
          const heading = group.groupType === 'SIZE' ? 'Choose your size' : group.groupType === 'TOPPINGS' || group.groupType === 'INCLUDED_TOPPING' ? 'Change your toppings' : group.groupType === 'EXTRAS' || group.groupType === 'EXTRA_ADDON' ? 'Add something extra' : group.name;
          const isExtras = group.groupType === 'EXTRAS' || group.groupType === 'EXTRA_ADDON';
          return (
            <div key={group.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="flex flex-col gap-2 bg-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-semibold text-stone-900">{heading}</div>
                  {group.groupType && group.groupType !== 'OTHER' ? <div className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">{group.name}</div> : null}
                  {group.description ? <p className="text-sm text-stone-500">{group.description}</p> : null}
                </div>
                <div className="text-sm text-stone-500">
                  {group.minSelections && group.minSelections > 0 ? 'Required' : 'Optional'} · {group.maxSelections === 1 ? 'Choose one' : 'Choose up to ' + (group.maxSelections ?? 'any')}
                </div>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {group.options.filter((option) => option.isActive !== false).map((option) => {
                  const optionChecked = selectedOptionIds.includes(option.id);
                  const disabled = !optionChecked && !isSingleSelect && maxReached;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${optionChecked ? 'border-amber-500 bg-amber-50' : 'border-stone-200 bg-white hover:border-stone-400'}`}
                    >
                      <input
                        type={isSingleSelect ? 'radio' : 'checkbox'}
                        name={`customization-${group.id}`}
                        checked={optionChecked}
                        disabled={disabled}
                        onChange={(event) => handleSelectOption(group, option.id, event.target.checked)}
                        className="h-4 w-4 text-amber-600"
                      />
                      {option.imageUrl ? <img src={option.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : null}<div className="min-w-0 flex-1">
                        <div className="font-medium text-stone-900">{option.name}</div>
                        {option.description ? <div className="text-xs text-stone-500">{option.description}</div> : null}
                        <div className="text-sm text-stone-500">{group.groupType === 'INCLUDED_TOPPING' || group.groupType === 'TOPPINGS' ? (option.defaultIncluded ? 'Included' : `+₹${option.price.toFixed(2)}`) : `₹${option.price.toFixed(2)}`}</div>
                      </div>
                      {isExtras && optionChecked ? <span className="flex items-center gap-2"><button type="button" aria-label={`Remove one ${option.name}`} onClick={(event) => { event.preventDefault(); setOptionQuantity(group, option.id, (optionQuantities[option.id] || 1) - 1); }} className="h-8 w-8 rounded-full border">−</button><span className="w-4 text-center text-sm font-semibold">{optionQuantities[option.id] || 1}</span><button type="button" aria-label={`Add one ${option.name}`} onClick={(event) => { event.preventDefault(); setOptionQuantity(group, option.id, (optionQuantities[option.id] || 1) + 1); }} className="h-8 w-8 rounded-full border">+</button></span> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-16 z-30 -mx-4 flex flex-col gap-3 border-t bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between md:bottom-0">
        <div>
          <div className="text-sm text-stone-600">Base ₹{basePrice.toFixed(2)} · Options ₹{selectedTotal.toFixed(2)}<div className="text-2xl font-semibold text-stone-900">₹{(basePrice + selectedTotal).toFixed(2)}</div></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3"><QuantityControl quantity={quantity} onChange={async (next) => setQuantity(Math.max(1, next))} /><AddToCartButton productId={productId} selectedOptions={selectedOptions} quantity={quantity} disabled={Boolean(validationError)} /><BuyNowButton productId={productId} selectedOptions={selectedOptions} quantity={quantity} disabled={Boolean(validationError)} /></div>
      </div>

      {validationError ? <p className="text-sm text-red-600">{validationError}</p> : null}
      {message ? <p className="text-sm text-stone-500">{message}</p> : null}
    </div>
  );
}
