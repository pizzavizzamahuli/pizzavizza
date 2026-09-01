'use client';

import { useCallback, useEffect, useState } from 'react';

type LegalPage = {
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
};

export default function LegalPagesPanel() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [draft, setDraft] = useState<LegalPage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPages = useCallback(async () => {
    const response = await fetch('/api/admin/legal-pages');
    const json = await response.json();
    const loaded = Array.isArray(json.data) ? json.data : [];
    setPages(loaded);
    if (loaded.length && !selectedSlug) {
      setSelectedSlug(loaded[0].slug);
      setDraft(loaded[0]);
    }
  }, [selectedSlug]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadPages().catch(() => setMessage('Unable to load legal pages.'));
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadPages]);

  function selectPage(slug: string) {
    const page = pages.find((item) => item.slug === slug) || null;
    setSelectedSlug(slug);
    setDraft(page ? { ...page } : null);
    setMessage(null);
  }

  async function savePage() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/legal-pages/${encodeURIComponent(draft.slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to save legal page');
      setMessage('Legal page saved.');
      await loadPages();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to save legal page');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-stone-900">Legal Pages</h2>
      <div className="mt-4 grid gap-4">
        <select value={selectedSlug} onChange={(event) => selectPage(event.target.value)} className="rounded-xl border border-stone-300 bg-white px-3 py-2">
          {pages.map((page) => (
            <option key={page.slug} value={page.slug}>{page.title}</option>
          ))}
        </select>
        {draft ? (
          <>
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="rounded-xl border border-stone-300 bg-white px-3 py-2" />
            <textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} className="min-h-56 rounded-xl border border-stone-300 bg-white px-3 py-2" />
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} />
              Published
            </label>
            <button type="button" onClick={savePage} disabled={saving} className="w-fit rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving...' : 'Save legal page'}
            </button>
          </>
        ) : (
          <p className="text-sm text-stone-600">No legal pages loaded.</p>
        )}
        {message ? <p className="text-sm text-stone-600">{message}</p> : null}
      </div>
    </div>
  );
}
