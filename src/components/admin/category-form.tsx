'use client';

import { useState } from 'react';

export function CategoryForm(): React.ReactElement {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setMessage('Category created');
      setName('');
      setSlug('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-sm">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm">Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded border px-3 py-2" required />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={isSubmitting} className="rounded bg-amber-600 px-4 py-2 text-white">{isSubmitting ? 'Creating...' : 'Create Category'}</button>
        {message ? <div className="mt-2 text-sm text-stone-600">{message}</div> : null}
      </div>
    </form>
  );
}

export default CategoryForm;
