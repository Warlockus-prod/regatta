'use client';

// Route-level error boundary. Renders inside the root layout (providers
// available) when a route segment throws during render. Without this, an
// uncaught client error white-screens the whole app. See also global-error.tsx
// for the layout-level fallback.

import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { tp } = useI18n();

  useEffect(() => {
    // Surface to the client error reporter / console for diagnostics.
    // eslint-disable-next-line no-console
    console.error('route error:', error);
  }, [error]);

  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-6 text-center"
      role="alert"
    >
      <div className="card p-8 max-w-md">
        <div className="text-4xl mb-3">⚓</div>
        <h1 className="text-xl font-semibold mb-2">
          {tp(
            'Что-то пошло не так',
            'Something went wrong',
            'Coś poszło nie tak',
            {
              es: 'Algo salió mal',
              fr: 'Une erreur est survenue',
              de: 'Etwas ist schiefgelaufen',
              it: 'Qualcosa è andato storto',
            },
          )}
        </h1>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            'Эту страницу не удалось показать. Попробуй ещё раз.',
            'This page could not be displayed. Please try again.',
            'Nie udało się wyświetlić tej strony. Spróbuj ponownie.',
            {
              es: 'No se pudo mostrar esta página. Inténtalo de nuevo.',
              fr: 'Cette page n\'a pas pu s\'afficher. Réessaie.',
              de: 'Diese Seite konnte nicht angezeigt werden. Versuch es noch einmal.',
              it: 'Impossibile mostrare questa pagina. Riprova.',
            },
          )}
        </p>
        <button
          onClick={reset}
          className="text-sm px-4 py-2 rounded-md border transition hover:bg-[rgba(0,212,255,0.08)]"
          style={{ borderColor: 'rgba(0, 212, 255, 0.4)', color: 'var(--accent-cyan)' }}
        >
          {tp('Повторить', 'Try again', 'Spróbuj ponownie', {
            es: 'Reintentar',
            fr: 'Réessayer',
            de: 'Erneut versuchen',
            it: 'Riprova',
          })}
        </button>
      </div>
    </div>
  );
}
