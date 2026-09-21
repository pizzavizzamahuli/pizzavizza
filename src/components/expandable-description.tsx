'use client';

import { useEffect, useRef, useState } from 'react';

export default function ExpandableDescription({ text, className = '' }: { text?: string | null; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const description = text || 'Made fresh to order.';

  useEffect(() => {
    setExpanded(false);
  }, [description]);

  useEffect(() => {
    if (expanded) return;
    const element = descriptionRef.current;
    if (!element) return;
    const checkOverflow = () => setHasMore(element.scrollHeight > element.clientHeight + 1);
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description, expanded]);

  return (
    <div className={`relative ${className}`}>
      <p ref={descriptionRef} className={expanded ? undefined : 'max-h-10 overflow-hidden'}>{description}</p>
      {hasMore && !expanded ? <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 z-10 h-5 w-20 bg-gradient-to-r from-transparent via-white to-white" /> : null}
      {hasMore ? <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setExpanded((current) => !current);
        }}
        className={expanded ? 'relative z-20 mt-1 inline cursor-pointer p-0 text-xs font-semibold text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline' : 'absolute bottom-0 right-0 z-20 cursor-pointer bg-white pl-3 pr-0 text-xs font-semibold text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline'}
      >
        {expanded ? 'less' : '...more'}
      </button> : null}
    </div>
  );
}