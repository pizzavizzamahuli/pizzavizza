'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { defaultSiteAnimations, type SiteAnimations } from '@/src/types/site-animations';
import { foodLoadingScenes } from '@/src/utils/food-loader';

const effects: Array<{ key: 'brandFloat' | 'contentGlow' | 'actionPulse' | 'foodLoader'; label: string; description: string }> = [
  { key: 'brandFloat', label: 'Brand mark float', description: 'Adds a gentle floating motion to the logo in the customer header.' },
  { key: 'contentGlow', label: 'Content highlight', description: 'Adds a soft, slow glow to the first content panel on customer pages.' },
  { key: 'actionPulse', label: 'Action button pulse', description: 'Gently highlights primary amber action buttons.' },
  { key: 'foodLoader', label: 'Food loading animation', description: 'Shows a randomly selected food-themed animation during page loads and navigation.' },
];
type BooleanAnimationKey = 'enabled' | 'brandFloat' | 'contentGlow' | 'actionPulse' | 'foodLoader' | 'foodLoaderRandom';

export default function AnimationSettingsPanel() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteAnimations>(defaultSiteAnimations);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/settings/animations')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load animation settings.');
        if (active) setSettings(data.data as SiteAnimations);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load animation settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function save(next: SiteAnimations) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/settings/animations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animations: next }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save animation settings.');
      setSettings(data.data as SiteAnimations);
      setMessage('Animation settings saved.');
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save animation settings.');
    } finally {
      setSaving(false);
    }
  }

  function update(key: BooleanAnimationKey, checked: boolean) {
    setSettings((current) => ({ ...current, [key]: checked }));
    setMessage(null);
  }

  function updateFoodScene(scene: SiteAnimations['foodLoaderScene']) {
    setSettings((current) => ({ ...current, foodLoaderScene: scene }));
    setMessage(null);
  }

  if (loading) return <p className="text-sm text-stone-500">Loading animation settings...</p>;

  return (
    <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <label className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <span><span className="block font-semibold text-stone-900">Enable website animations</span><span className="mt-1 block text-sm text-stone-600">Master switch for all effects below.</span></span>
        <input type="checkbox" checked={settings.enabled} disabled={saving} onChange={(event) => update('enabled', event.target.checked)} className="h-5 w-5 accent-amber-600" />
      </label>
      <div className="divide-y divide-stone-100">
        {effects.map((effect) => (
          <label key={effect.key} className={`flex min-h-14 items-center justify-between gap-4 py-4 ${settings.enabled ? '' : 'opacity-60'}`}>
            <span><span className="block font-medium text-stone-900">{effect.label}</span><span className="mt-1 block text-sm text-stone-600">{effect.description}</span></span>
            <input type="checkbox" checked={settings[effect.key]} disabled={saving || !settings.enabled} onChange={(event) => update(effect.key, event.target.checked)} className="h-5 w-5 shrink-0 accent-amber-600" />
          </label>
        ))}
      </div>
      <fieldset disabled={saving || !settings.enabled || !settings.foodLoader} className="space-y-3 rounded-xl border border-stone-200 p-4 disabled:opacity-60">
        <legend className="px-1 text-sm font-semibold text-stone-900">Food loading style</legend>
        <p className="text-sm text-stone-600">Choose one food scene or let the loader pick a different random food each time.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={settings.foodLoaderRandom}
            onClick={() => update('foodLoaderRandom', true)}
            className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${settings.foodLoaderRandom ? 'bg-amber-600 text-white' : 'border border-stone-300 text-stone-700'}`}
          >
            Play randomly
          </button>
          <button
            type="button"
            aria-pressed={!settings.foodLoaderRandom}
            onClick={() => update('foodLoaderRandom', false)}
            className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${!settings.foodLoaderRandom ? 'bg-amber-600 text-white' : 'border border-stone-300 text-stone-700'}`}
          >
            Choose one
          </button>
        </div>
        <label className="block text-sm font-medium text-stone-700">
          Selected food animation
          <select
            value={settings.foodLoaderScene}
            disabled={settings.foodLoaderRandom || saving || !settings.enabled || !settings.foodLoader}
            onChange={(event) => updateFoodScene(event.target.value as SiteAnimations['foodLoaderScene'])}
            className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100 sm:max-w-sm"
          >
            {foodLoadingScenes.map((scene) => <option key={scene.name} value={scene.name}>{scene.emoji} {scene.name[0].toUpperCase() + scene.name.slice(1)}</option>)}
          </select>
        </label>
        <p className="text-xs text-stone-500">{foodLoadingScenes.length} food scenes are available. Your mode and selection are applied after saving.</p>
      </fieldset>
      <p className="text-xs text-stone-500">Animations automatically pause for visitors who have enabled reduced motion in their device accessibility settings.</p>
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      <button type="button" disabled={saving} onClick={() => { void save(settings); }} className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
        {saving ? 'Saving...' : 'Save animation settings'}
      </button>
    </section>
  );
}
