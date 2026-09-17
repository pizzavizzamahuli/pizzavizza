'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type LegalPage = {
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
};

type AboutImage = {
  id: string;
  imageUrl: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

type AboutDraft = {
  aboutHeading: string;
  aboutDescription: string;
  aboutImages: AboutImage[];
};

export default function LegalPagesPanel() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [draft, setDraft] = useState<LegalPage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);
  const [aboutDraft, setAboutDraft] = useState<AboutDraft>({ aboutHeading: '', aboutDescription: '', aboutImages: [] });
  const [aboutFile, setAboutFile] = useState<File | null>(null);
  const [aboutFileDescription, setAboutFileDescription] = useState('');
  const [aboutSaving, setAboutSaving] = useState(false);

  const aboutPreview = useMemo(() => aboutFile ? URL.createObjectURL(aboutFile) : null, [aboutFile]);

  useEffect(() => () => {
    if (aboutPreview) URL.revokeObjectURL(aboutPreview);
  }, [aboutPreview]);

  const loadPages = useCallback(async () => {
    const [pagesResponse, settingsResponse] = await Promise.all([fetch('/api/admin/legal-pages'), fetch('/api/admin/settings/restaurant')]);
    const json = await pagesResponse.json();
    const settingsJson = await settingsResponse.json();
    const loaded = Array.isArray(json.data) ? json.data : [];
    setPages(loaded);
    if (settingsJson.success) {
      setAboutDraft({
        aboutHeading: settingsJson.data.aboutHeading || '',
        aboutDescription: settingsJson.data.aboutDescription || '',
        aboutImages: Array.isArray(settingsJson.data.aboutImages) ? settingsJson.data.aboutImages : [],
      });
    }
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
    setMessageTone('success');
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
      setMessageTone('error');
      setMessage(err instanceof Error ? err.message : 'Failed to save legal page');
    } finally {
      setSaving(false);
    }
  }

  async function saveAbout() {
    setAboutSaving(true);
    setMessage(null);
    setMessageTone('success');
    try {
      const previousImages = aboutDraft.aboutImages;
      let nextImages = previousImages;
      if (aboutFile) {
        const body = new FormData();
        body.append('aboutImage', aboutFile);
        const uploadResponse = await fetch('/api/admin/settings/restaurant/about-image', { method: 'POST', body });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.success) throw new Error(uploadData.error || 'About image upload failed.');
        nextImages = [...nextImages, { id: crypto.randomUUID(), imageUrl: uploadData.data, description: aboutFileDescription.trim() || null, sortOrder: nextImages.length, isActive: true }];
      }
      nextImages = nextImages.map((image, index) => ({ ...image, sortOrder: index }));
      const response = await fetch('/api/admin/settings/restaurant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aboutHeading: aboutDraft.aboutHeading, aboutDescription: aboutDraft.aboutDescription, aboutImages: nextImages }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'About section save failed.');
      setAboutDraft({ aboutHeading: data.data.aboutHeading || '', aboutDescription: data.data.aboutDescription || '', aboutImages: data.data.aboutImages || [] });
      setAboutFile(null);
      setAboutFileDescription('');
      setMessage('About section saved.');
    } catch (error) {
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'About section save failed.');
    } finally {
      setAboutSaving(false);
    }
  }

  return (
    <div className="space-y-5 rounded-3xl border border-stone-200 bg-white p-4 sm:p-6">
      <div><h2 className="text-lg font-semibold text-stone-900">Legal Pages</h2>
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
        {message ? <p role="status" className={`rounded-xl border px-3 py-2 text-sm ${messageTone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message}</p> : null}
      </div>
      </div>
      <section className="border-t border-stone-200 pt-5">
        <div><h2 className="text-lg font-semibold text-stone-900">Restaurant About section</h2><p className="mt-1 text-sm text-stone-500">Edit the About copy and add one or more images. Each image can have its own description.</p></div>
        <div className="mt-4 grid gap-4">
          <label className="text-sm font-medium text-stone-700">About heading<input value={aboutDraft.aboutHeading} onChange={(event) => setAboutDraft({ ...aboutDraft, aboutHeading: event.target.value })} maxLength={160} className="input mt-1 w-full" placeholder="Good food, made for good company." /></label>
          <label className="text-sm font-medium text-stone-700">About description<textarea value={aboutDraft.aboutDescription} onChange={(event) => setAboutDraft({ ...aboutDraft, aboutDescription: event.target.value })} maxLength={1000} rows={4} className="input mt-1 w-full" placeholder="Tell customers about your restaurant..." /></label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-stone-800">About images</p><p className="text-xs text-stone-500">Use landscape images for the best mobile and desktop result.</p></div><label htmlFor="about-image-picker" className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Add About image</label></div>
          <input id="about-image-picker" type="file" accept="image/*" className="sr-only" onChange={(event) => setAboutFile(event.target.files?.[0] || null)} />
          {aboutPreview ? <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3"><p className="text-xs font-semibold text-amber-800">New image ready to add</p><img src={aboutPreview} alt="New About preview" className="mt-2 aspect-[16/10] w-full rounded-lg object-cover" /><label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-stone-500">Image description<textarea value={aboutFileDescription} onChange={(event) => setAboutFileDescription(event.target.value)} rows={3} maxLength={500} className="input mt-1 w-full" placeholder="Describe this restaurant image" /></label><p className="mt-2 text-xs text-stone-600">Save the About section to add this image.</p></div> : null}
          {aboutDraft.aboutImages.length ? <div className="grid gap-4 sm:grid-cols-2">{aboutDraft.aboutImages.map((image, index) => <div key={image.id} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-3"><img src={image.imageUrl} alt={`About image ${index + 1}`} className="aspect-[16/10] w-full rounded-lg bg-stone-200 object-cover" /><label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-stone-500">Image description<textarea value={image.description || ''} onChange={(event) => setAboutDraft({ ...aboutDraft, aboutImages: aboutDraft.aboutImages.map((item) => item.id === image.id ? { ...item, description: event.target.value } : item) })} rows={3} maxLength={500} className="input mt-1 w-full" placeholder="Describe this restaurant image" /></label><button type="button" onClick={() => setAboutDraft({ ...aboutDraft, aboutImages: aboutDraft.aboutImages.filter((item) => item.id !== image.id) })} className="mt-3 rounded-full border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">Remove image</button></div>)}</div> : <p className="rounded-xl border border-dashed border-stone-300 p-5 text-center text-sm text-stone-500">No About images added yet.</p>}
          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={saveAbout} disabled={aboutSaving} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{aboutSaving ? 'Saving About...' : 'Save About section'}</button></div>
        </div>
      </section>
    </div>
  );
}
