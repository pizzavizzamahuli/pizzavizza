/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

type ImageCarouselProps = {
  images: Array<string | null | undefined>;
  title: string;
  aspectClassName?: string;
  imageClassName?: string;
  thumbnails?: boolean;
  captions?: Array<string | null | undefined>;
  expandableCaptions?: boolean;
};

function normalizeImages(images: ImageCarouselProps['images']) {
  const valid = images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0);
  return Array.from(new Set(valid));
}

export default function ImageCarousel({ images, title, aspectClassName = 'aspect-[4/3]', imageClassName = 'object-cover', thumbnails = false, captions, expandableCaptions = false }: ImageCarouselProps) {
  const gallery = useMemo(() => normalizeImages(images), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const touchStartX = useRef<number | null>(null);
  const hasMultiple = gallery.length > 1;
  if (!gallery.length) return <div className={`flex w-full items-center justify-center bg-stone-100 text-sm text-stone-500 ${aspectClassName}`}>Image unavailable</div>;
  const currentIndex = Math.min(activeIndex, gallery.length - 1);
  const currentImage = gallery[currentIndex];
  const currentImageFailed = failedImages.has(currentImage);

  useEffect(() => {
    setCaptionExpanded(false);
    if (captionRef.current) captionRef.current.scrollTop = 0;
  }, [currentIndex]);

  function move(direction: number) {
    setActiveIndex((index) => (index + direction + gallery.length) % gallery.length);
  }

  function handleControlClick(event: MouseEvent<HTMLButtonElement>, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action();
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
    <div className={`relative w-full overflow-hidden ${expandableCaptions ? 'bg-[#fff8ed]' : ''}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className={`relative w-full overflow-hidden ${expandableCaptions ? 'bg-[#fffaf2]' : 'bg-stone-100'} ${aspectClassName}`}>
        {currentImageFailed ? <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-stone-500">Image unavailable</div> : <img src={currentImage} alt={`${title}, image ${currentIndex + 1} of ${gallery.length}`} className={`h-full w-full ${imageClassName}`} loading="lazy" onError={() => handleImageError(gallery[currentIndex])} />}
        {hasMultiple ? <>
          <button type="button" aria-label={`Previous ${title} image`} onClick={(event) => handleControlClick(event, () => move(-1))} className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white shadow-md transition hover:bg-black/75">‹</button>
          <button type="button" aria-label={`Next ${title} image`} onClick={(event) => handleControlClick(event, () => move(1))} className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white shadow-md transition hover:bg-black/75">›</button>
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">{currentIndex + 1}/{gallery.length}</span>
        </> : null}
      </div>
      {hasMultiple ? <div className="flex items-center justify-center gap-1.5 px-2 py-2" aria-label={`${title} image selector`}>
        {gallery.map((image, index) => <button key={`${image}-${index}`} type="button" aria-label={`Show ${title} image ${index + 1}`} aria-current={currentIndex === index} onClick={(event) => handleControlClick(event, () => setActiveIndex(index))} className={`relative z-10 h-1.5 rounded-full transition-all ${currentIndex === index ? 'w-6 bg-amber-600' : 'w-1.5 bg-stone-300 hover:bg-stone-500'}`} />)}
      </div> : null}
      {captions?.[currentIndex]?.trim() ? expandableCaptions ? <div className="relative border-t border-amber-100 bg-[#fff8ed] px-4 pb-3 pt-3 text-center text-sm text-stone-600">
        <p ref={captionRef} className={captionExpanded ? 'max-h-28 overflow-y-auto pr-1 text-left' : 'max-h-16 overflow-hidden text-left'}>{captions[currentIndex]}</p>
        {!captionExpanded ? <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-4 z-10 h-5 w-20 bg-gradient-to-r from-transparent via-[#fff8ed] to-[#fff8ed]" /> : null}
        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setCaptionExpanded((current) => { if (current && captionRef.current) captionRef.current.scrollTop = 0; return !current; }); }} className={captionExpanded ? 'relative z-10 mt-1 inline cursor-pointer p-0 text-xs font-semibold text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline' : 'absolute bottom-3 right-4 z-20 cursor-pointer bg-[#fff8ed] pl-3 pr-0 text-xs font-semibold text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline'}>
          {captionExpanded ? 'less' : '...more'}
        </button>
      </div> : <p className="px-4 pb-3 text-center text-sm text-stone-600">{captions[currentIndex]}</p> : null}
      {thumbnails && hasMultiple ? <div className="relative z-10 flex gap-2 overflow-x-auto py-1">{gallery.map((image, index) => <button key={`thumb-${image}-${index}`} type="button" onClick={(event) => handleControlClick(event, () => setActiveIndex(index))} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${currentIndex === index ? 'border-amber-500' : 'border-transparent'}`}><img src={image} alt={`${title} thumbnail ${index + 1}`} className="h-full w-full object-cover" loading="lazy" onError={() => handleImageError(image)} /></button>)}</div> : null}
    </div>
  );
}
