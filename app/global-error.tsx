'use client';

import type { ReactNode } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#fff7ed' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            color: '#1c1917',
          }}
        >
          <div
            style={{
              maxWidth: 560,
              width: '100%',
              background: '#ffffff',
              border: '1px solid #fed7aa',
              borderRadius: 20,
              padding: '32px 28px',
              boxShadow: '0 10px 30px rgba(120, 53, 15, 0.08)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#c2410c',
                fontWeight: 700,
              }}
            >
              Pizza Vizza
            </p>
            <h2 style={{ margin: '12px 0 8px', fontSize: 28 }}>Something went wrong</h2>
            <p style={{ margin: 0, lineHeight: 1.6, color: '#44403c' }}>
              The app hit an unexpected error while rendering. Please refresh the page or try again.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                marginTop: 20,
                border: 'none',
                background: '#f59e0b',
                color: '#fff',
                borderRadius: 999,
                padding: '10px 18px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
