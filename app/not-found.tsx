export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-stone-900">Page not found</h1>
        <p className="mt-2 text-sm text-stone-600">
          The requested page is not available in this foundation phase.
        </p>
      </div>
    </main>
  );
}
