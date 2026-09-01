'use client';

import { useEffect, useState } from 'react';

type CustomizationOptionEditor = {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
};

type CustomizationGroupSummary = {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  required?: boolean;
  options?: { id: string; name: string }[];
};

type CustomizationGroupDetail = Omit<CustomizationGroupSummary, 'options'> & {
  minSelections?: number | null;
  maxSelections?: number | null;
  options?: Array<{
    id: string;
    name?: string | null;
    price?: number | null;
    isActive?: boolean;
  }>;
};

export function CustomizationGroupList({ groups }: { groups: CustomizationGroupSummary[] }) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [editGroup, setEditGroup] = useState<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    isActive: boolean;
    minSelections: string;
    maxSelections: string;
    options: CustomizationOptionEditor[];
  } | null>(null);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    fetch(`/api/admin/menu/customization-groups/${selectedGroupId}`)
      .then((response) => response.json())
      .then((json) => {
        if (!json.success || !json.data) {
          throw new Error(json.error || 'Failed to load group');
        }
        const group = json.data as CustomizationGroupDetail;
        setEditGroup({
          id: group.id,
          name: group.name || '',
          description: group.description || '',
          required: Boolean(group.required),
          isActive: group.isActive !== false,
          minSelections: group.minSelections != null ? String(group.minSelections) : '',
          maxSelections: group.maxSelections != null ? String(group.maxSelections) : '',
          options: (group.options || []).map((option) => ({
            id: option.id,
            name: option.name || '',
            price: String(option.price ?? 0),
            isActive: option.isActive !== false,
          })),
        });
      })
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : String(error);
        setMessage(msg || 'Failed to load group');
        setSelectedGroupId(null);
      })
      .finally(() => setIsLoadingGroup(false));
  }, [selectedGroupId]);

  const createEmptyOption = () => ({
    id: crypto?.randomUUID?.() ?? String(Date.now()) + Math.random(),
    name: '',
    price: '0',
    isActive: true,
  });

  const openEditor = (groupId: string) => {
    setSelectedGroupId(groupId);
    setEditGroup(null);
    setMessage(null);
    setIsLoadingGroup(true);
  };

  const closeEditor = () => {
    setSelectedGroupId(null);
    setEditGroup(null);
    setMessage(null);
  };

  const updateOption = (optionId: string, update: Partial<CustomizationOptionEditor>) => {
    if (!editGroup) return;
    setEditGroup((current) =>
      current
        ? {
            ...current,
            options: current.options.map((option) => (option.id === optionId ? { ...option, ...update } : option)),
          }
        : current,
    );
  };

  const removeOption = (optionId: string) => {
    if (!editGroup) return;
    setEditGroup((current) =>
      current ? { ...current, options: current.options.filter((option) => option.id !== optionId) } : current,
    );
  };

  const addOption = () => {
    if (!editGroup) return;
    setEditGroup((current) =>
      current ? { ...current, options: [...current.options, createEmptyOption()] } : current,
    );
  };

  async function handleDelete(id: string) {
    setIsDeleting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/menu/customization-groups/${id}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to delete');
      setMessage('Customization group deleted');
      setSelectedGroupId(null);
      window.location.reload();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage(msg || 'Error');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSave() {
    if (!editGroup) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const cleanedOptions = editGroup.options
        .filter((option) => option.name.trim())
        .map((option) => ({
          id: option.id,
          name: option.name.trim(),
          price: Number(option.price || 0),
          isActive: option.isActive,
        }));

      const payload = {
        name: editGroup.name.trim(),
        description: editGroup.description.trim() || undefined,
        required: editGroup.required,
        isActive: editGroup.isActive,
        minSelections: editGroup.minSelections === '' ? undefined : Number(editGroup.minSelections),
        maxSelections: editGroup.maxSelections === '' ? undefined : Number(editGroup.maxSelections),
        options: cleanedOptions,
      };

      const response = await fetch(`/api/admin/menu/customization-groups/${editGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to update group');
      setMessage('Customization group updated');
      window.location.reload();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage(msg || 'Error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
          No customization groups found.
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li key={group.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-lg font-semibold text-stone-900">{group.name}</div>
                  <div className="text-sm text-stone-500">{group.description || 'No description'}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
                    <span className="rounded-full bg-stone-100 px-2 py-1">{group.isActive === false ? 'Inactive' : 'Active'}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-1">{group.required ? 'Required' : 'Optional'}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-1">{group.options?.length ?? 0} options</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditor(group.id)}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(group.id)}
                    disabled={isDeleting}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedGroupId ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Edit customization group</h2>
              <p className="text-sm text-stone-600">Update group details and option configuration.</p>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700"
            >
              Close
            </button>
          </div>

          {isLoadingGroup || !editGroup ? (
            <div className="text-sm text-stone-600">Loading group…</div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-stone-700">Group name</label>
                  <input
                    value={editGroup.name}
                    onChange={(e) => setEditGroup((current) => (current ? { ...current, name: e.target.value } : current))}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Active</label>
                  <select
                    value={editGroup.isActive ? 'true' : 'false'}
                    onChange={(e) => setEditGroup((current) => (current ? { ...current, isActive: e.target.value === 'true' } : current))}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-stone-700">Description</label>
                  <textarea
                    value={editGroup.description}
                    onChange={(e) => setEditGroup((current) => (current ? { ...current, description: e.target.value } : current))}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
                    <input
                      type="checkbox"
                      checked={editGroup.required}
                      onChange={(e) => setEditGroup((current) => (current ? { ...current, required: e.target.checked } : current))}
                      className="h-4 w-4 rounded border-stone-300 text-amber-600"
                    />
                    Required selection
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Min selections</label>
                    <input
                      type="number"
                      min="0"
                      value={editGroup.minSelections}
                      onChange={(e) => setEditGroup((current) => (current ? { ...current, minSelections: e.target.value } : current))}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Max selections</label>
                    <input
                      type="number"
                      min="0"
                      value={editGroup.maxSelections}
                      onChange={(e) => setEditGroup((current) => (current ? { ...current, maxSelections: e.target.value } : current))}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-stone-900">Options</div>
                  <button type="button" onClick={addOption} className="rounded-full border border-amber-600 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100">
                    Add option
                  </button>
                </div>
                <div className="space-y-3">
                  {editGroup.options.map((option) => (
                    <div key={option.id} className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-stone-700">Option name</label>
                        <input
                          value={option.name}
                          onChange={(e) => updateOption(option.id, { name: e.target.value })}
                          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
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
                            onChange={(e) => updateOption(option.id, { price: e.target.value })}
                            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                            <input
                              type="checkbox"
                              checked={option.isActive}
                              onChange={(e) => updateOption(option.id, { isActive: e.target.checked })}
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

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
                {message ? <div className="text-sm text-stone-600">{message}</div> : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default CustomizationGroupList;
