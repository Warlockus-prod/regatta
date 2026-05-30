'use client';

// Layout-level error boundary. This replaces the ROOT layout when the layout
// itself throws, so it cannot rely on the I18nProvider or global CSS variables -
// it must render its own <html>/<body> and be fully self-contained. Bilingual
// RU/EN only by design (no provider to resolve the active language here).

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a1628',
          color: '#e8f4f8',
          fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚓</div>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>
            Something went wrong / Что-то пошло не так
          </h1>
          <p style={{ fontSize: 14, color: '#8ba7b8', margin: '0 0 20px' }}>
            The app hit an unexpected error. Please reload. / Произошла ошибка. Перезагрузите страницу.
          </p>
          <button
            onClick={reset}
            style={{
              fontSize: 14,
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid rgba(0, 212, 255, 0.4)',
              background: 'transparent',
              color: '#00d4ff',
              cursor: 'pointer',
            }}
          >
            Reload / Перезагрузить
          </button>
        </div>
      </body>
    </html>
  );
}
