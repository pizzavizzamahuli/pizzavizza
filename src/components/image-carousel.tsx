/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo, useRef, useState } from 'react';

const FALLBACK_IMAGE = '/icon-512.png';

type ImageCarouselProps = {
  images: Array<string | null | undefined>;
  title: string;
  aspectClassName?: string;
  imageClassName?: string;
  thumbnails?: boolean;
};

function normalizeImages(images: ImageCarouselProps['images']) {
  const valid = images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0);
  return valid.length ? Array.from(new Set(valid)) : [FALLBACK_IMAGE];
}

export default function ImageCarousel({ images, title, aspectClassName = 'aspect-[4/3]', imageClassName = 'object-cover', thumbnails = false }: ImageCarouselProps) {
  const gallery = useMemo(() => normalizeImages(images), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const touchStartX = useRef<number | null>(null);
  const hasMultiple = gallery.length > 1;
  const currentIndex = Math.min(activeIndex, gallery.length - 1);
  const currentImage = failedImages.has(gallery[currentIndex]) ? FALLBACK_IMAGE : gallery[currentIndex];

  function move(direction: number) {
    setActiveIndex((index) => (index + direction + gallery.length) % gallery.length);
  }

  function handleImageError(image: string) {
    setFailedImages((current) => {
      const next = new Set(current);
      next.add(image);
      return next;
    });
    if (gallery.length > 1 && gallery[currentIndex] === image) move(1);
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null || !hasMultiple) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(distance) > 36) move(distance < 0 ? 1 : -1);
    touchStartX.current = null;
  }

  return (
    <div className="relative w-full overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className={`relative w-full overflow-hidden bg-stone-100 ${aspectClassName}`}>
        <img src={currentImage} alt={`${title}, image ${currentIndex + 1} of ${gallery.length}`} className={`h-full w-full ${imageClassName}`} loading="lazy" onError={() => handleImageError(gallery[currentIndex])} />
        {hasMultiple ? <>
          <button type="button" aria-label={`Previous ${title} image`} onClick={() => move(-1)} className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white shadow-md transition hover:bg-black/75">‹</button>
          <button type="button" aria-label={`Next ${title} image`} onClick={() => move(1)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white shadow-md transition hover:bg-black/75">›</button>
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">{currentIndex + 1}/{gallery.length}</span>
        </> : null}
      </div>
      {hasMultiple ? <div className="flex items-center justify-center gap-1.5 px-2 py-2" aria-label={`${title} image selector`}>
        {gallery.map((image, index) => <button key={`${image}-${index}`} type="button" aria-label={`Show ${title} image ${index + 1}`} aria-current={currentIndex === index} onClick={() => setActiveIndex(index)} className={`h-1.5 rounded-full transition-all ${currentIndex === index ? 'w-6 bg-amber-600' : 'w-1.5 bg-stone-300 hover:bg-stone-500'}`} />)}
      </div> : null}
      {thumbnails && hasMultiple ? <div className="flex gap-2 overflow-x-auto py-1">{gallery.map((image, index) => <button key={`thumb-${image}-${index}`} type="button" onClick={() => setActiveIndex(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${currentIndex === index ? 'border-amber-500' : 'border-transparent'}`}><img src={failedImages.has(image) ? FALLBACK_IMAGE : image} alt={`${title} thumbnail ${index + 1}`} className="h-full w-full object-cover" loading="lazy" onError={() => handleImageError(image)} /></button>)}</div> : null}
    </div>
  );
}
