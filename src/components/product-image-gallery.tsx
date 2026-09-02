/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo, useState } from 'react';

type ProductImageGalleryProps = {
  images: string[];
  title: string;
};

const PLACEHOLDER = '/icon-512.png';

export default function ProductImageGallery({ images, title }: ProductImageGalleryProps) {
  const gallery = useMemo(() => {
    const filtered = images.filter((image) => Boolean(image));
    return filtered.length ? Array.from(new Set(filtered)) : [PLACEHOLDER];
  }, [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const safeActiveIndex = gallery.length === 0 ? 0 : Math.min(activeIndex, gallery.length - 1);
  const activeImage = gallery[safeActiveIndex] || PLACEHOLDER;
  const hasMultiple = gallery.length > 1;

  const openViewer = () => setIsOpen(true);
  const closeViewer = () => setIsOpen(false);
  const showPrev = () => setActiveIndex((current) => (current - 1 + gallery.length) % gallery.length);
  const showNext = () => setActiveIndex((current) => (current + 1) % gallery.length);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={openViewer}
        className="group relative block w-full overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <div className="relative h-96 w-full">
          <img
            src={activeImage}
            alt={title}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm">
          Tap to enlarge
        </span>
      </button>

      {hasMultiple ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {gallery.map((imageUrl, index) => (
            <button
              key={imageUrl + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`shrink-0 overflow-hidden rounded-2xl border transition ${
                safeActiveIndex === index ? 'border-amber-500 ring-2 ring-amber-200' : 'border-stone-200'
              }`}
            >
              <img
                src={imageUrl}
                alt={`${title} image ${index + 1}`}
                className="h-24 w-24 object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="absolute inset-0" onClick={closeViewer} />
          <button
            type="button"
            onClick={closeViewer}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-stone-900 shadow-md"
          >
            Close
          </button>

          {hasMultiple ? (
            <button
              type="button"
              onClick={showPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-stone-900 shadow-md"
            >
              ‹
            </button>
          ) : null}

          <div className="relative max-h-[90vh] max-w-full overflow-hidden rounded-3xl bg-stone-900 p-4 shadow-2xl">
            <img
              src={activeImage}
              alt={title}
              className="max-h-[80vh] w-full object-contain"
            />
          </div>

          {hasMultiple ? (
            <button
              type="button"
              onClick={showNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-stone-900 shadow-md"
            >
              ›
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
