'use client';

import { useMemo, useState } from 'react';
import AddToCartButton from '@/src/components/add-to-cart-button';

type CustomizationOption = {
  id: string;
  name: string;
  price: number;
  isActive?: boolean;
};

type CustomizationGroup = {
  id: string;
  name: string;
  description?: string | null;
  required?: boolean;
  minSelections?: number | null;
  maxSelections?: number | null;
  options: CustomizationOption[];
};

type ProductCustomizationFormProps = {
  productId: string;
  groups: CustomizationGroup[];
};

export default function ProductCustomizationForm({ productId, groups }: ProductCustomizationFormProps) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

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
      if (group.required && count === 0) {
        return `Please select at least one option for ${group.name}.`;
      }
      if (group.minSelections != null && count < group.minSelections) {
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

  const selectedTotal = useMemo(() => {
    return groups.reduce((sum, group) => {
      return sum + group.options.filter((option) => selectedOptionIds.includes(option.id)).reduce((groupSum, option) => groupSum + option.price, 0);
    }, 0);
  }, [groups, selectedOptionIds]);

  return (
    <div className="space-y-6 rounded-3xl border border-stone-200 bg-stone-50 p-6">
      <div className="space-y-4">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Customizations</div>
        {groups.map((group) => {
          const selectedForGroup = groupSelection[group.id] || [];
          const isSingleSelect = group.maxSelections === 1;
          const maxReached = group.maxSelections != null && selectedForGroup.length >= group.maxSelections;
          return (
            <div key={group.id} className="rounded-3xl border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-semibold text-stone-900">{group.name}</div>
                  {group.description ? <p className="text-sm text-stone-500">{group.description}</p> : null}
                </div>
                <div className="text-sm text-stone-500">
                  {group.required ? 'Required' : 'Optional'} · {group.maxSelections === 1 ? 'Choose one' : 'Choose up to ' + (group.maxSelections ?? 'any')}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {group.options.map((option) => {
                  const optionChecked = selectedOptionIds.includes(option.id);
                  const disabled = !optionChecked && !isSingleSelect && maxReached;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-3xl border p-4 transition ${optionChecked ? 'border-amber-500 bg-amber-50' : 'border-stone-200 bg-white hover:border-stone-400'}`}
                    >
                      <input
                        type={isSingleSelect ? 'radio' : 'checkbox'}
                        name={`customization-${group.id}`}
                        checked={optionChecked}
                        disabled={disabled}
                        onChange={(event) => handleSelectOption(group, option.id, event.target.checked)}
                        className="h-4 w-4 text-amber-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-stone-900">{option.name}</div>
                        <div className="text-sm text-stone-500">₹{option.price.toFixed(2)}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-stone-600">Customization total</div>
          <div className="text-2xl font-semibold text-stone-900">₹{selectedTotal.toFixed(2)}</div>
        </div>
        <AddToCartButton productId={productId} selectedOptionIds={selectedOptionIds} disabled={Boolean(validationError)} />
      </div>

      {validationError ? <p className="text-sm text-red-600">{validationError}</p> : null}
      {message ? <p className="text-sm text-stone-500">{message}</p> : null}
    </div>
  );
}
