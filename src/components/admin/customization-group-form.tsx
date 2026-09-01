'use client';

import { useState } from 'react';

type CustomizationOptionDraft = {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
};

function createEmptyOption(): CustomizationOptionDraft {
  return { id: crypto?.randomUUID?.() ?? String(Date.now()) + Math.random(), name: '', price: '0', isActive: true };
}

export function CustomizationGroupForm(): React.ReactElement {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [minSelections, setMinSelections] = useState('');
  const [maxSelections, setMaxSelections] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [options, setOptions] = useState<CustomizationOptionDraft[]>([createEmptyOption()]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = () => setOptions((current) => [...current, createEmptyOption()]);
  const removeOption = (id: string) => setOptions((current) => current.filter((option) => option.id !== id));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const cleanedOptions = options
        .filter((option) => option.name.trim())
        .map((option) => ({
          id: option.id,
          name: option.name.trim(),
          price: Number(option.price || 0),
          isActive: option.isActive,
        }));

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        required,
        minSelections: minSelections === '' ? undefined : Number(minSelections),
        maxSelections: maxSelections === '' ? undefined : Number(maxSelections),
        isActive,
        options: cleanedOptions,
      };

      const response = await fetch('/api/admin/menu/customization-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to create group');

      setMessage('Customization group created');
      setName('');
      setDescription('');
      setRequired(false);
      setMinSelections('');
      setMaxSelections('');
      setIsActive(true);
      setOptions([createEmptyOption()]);
      window.location.reload();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage(msg || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-stone-700">Group name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" required />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-stone-700">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" rows={3} />
      </div>
      <div>
        <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-amber-600" />
          Required selection
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Active</label>
        <select value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2">
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Min selections</label>
        <input type="number" min="0" value={minSelections} onChange={(e) => setMinSelections(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" placeholder="Optional" />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Max selections</label>
        <input type="number" min="0" value={maxSelections} onChange={(e) => setMaxSelections(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" placeholder="Optional" />
      </div>

      <div className="sm:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-stone-900">Options</div>
          <button type="button" onClick={addOption} className="rounded-full border border-amber-600 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100">
            Add option
          </button>
        </div>
        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={option.id} className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-stone-700">Option name</label>
                <input
                  value={option.name}
                  onChange={(e) => setOptions((current) => current.map((item) => (item.id === option.id ? { ...item, name: e.target.value } : item)))}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                  placeholder={`Option ${index + 1}`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
                <div>
                  <label className="block text-sm font-medium text-stone-700">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={option.price}
                    onChange={(e) => setOptions((current) => current.map((item) => (item.id === option.id ? { ...item, price: e.target.value } : item)))}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={option.isActive}
                      onChange={(e) => setOptions((current) => current.map((item) => (item.id === option.id ? { ...item, isActive: e.target.checked } : item)))}
                      className="h-4 w-4 rounded border-stone-300 text-amber-600"
                    />
                    Active
                  </label>
                  <button type="button" onClick={() => removeOption(option.id)} className="text-sm text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isSubmitting} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Saving...' : 'Create group'}
        </button>
        {message ? <div className="text-sm text-stone-600">{message}</div> : null}
      </div>
    </form>
  );
}

export default CustomizationGroupForm;
