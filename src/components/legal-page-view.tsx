import { notFound } from 'next/navigation';
import { findLegalPageBySlug } from '@/src/models/legal-page';

export default async function LegalPageView({ slug }: { slug: string }) {
  const page = await findLegalPageBySlug(slug);
  if (!page || !page.isPublished) return notFound();

  return (
    <article className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Pizza Vizza</p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">{page.title}</h1>
      <div className="mt-6 whitespace-pre-line text-sm leading-7 text-stone-700">{page.content}</div>
    </article>
  );
}
