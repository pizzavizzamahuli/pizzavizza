'use client';

import { useState } from 'react';

export default function ReadMoreText({ text, className = '' }: { text?: string | null; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  return (
    <div className={className}>
      <p className={expanded ? undefined : 'max-h-10 overflow-hidden'}>{text}</p>
      <button type="button" onClick={() => setExpanded((current) => !current)} className="mt-1 inline-flex min-h-8 cursor-pointer items-center rounded-full border border-amber-200 px-3 py-1 font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800">
        {expanded ? 'Show less' : 'See more'}
      </button>
    </div>
  );
}