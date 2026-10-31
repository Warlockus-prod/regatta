'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import type { SternikBank } from '@/data/sternik-core';
import { loadSternikBank, peekSternikBank } from './bank';

// ============================================================================
// The question bank arrives at run time (see ./bank.ts), so every screen that
// needs it has three states: loading, failed (with Retry) and ready. The gate
// renders its children only with a complete, validated bank.
// ============================================================================

export type SternikBankState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; bank: SternikBank };

export function useSternikBank(): { state: SternikBankState; retry: () => void } {
  // A bank already in memory (an earlier page, or the offline package) shows at
  // once. The website's server render has none, so hydration starts at loading.
  const [state, setState] = useState<SternikBankState>(() => {
    const bank = peekSternikBank();
    return bank ? { status: 'ready', bank } : { status: 'loading' };
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    loadSternikBank().then(
      (bank) => { if (alive) setState((prev) => (prev.status === 'ready' && prev.bank === bank ? prev : { status: 'ready', bank })); },
      () => { if (alive) setState({ status: 'error' }); },
    );
    return () => { alive = false; };
  }, [attempt]);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return { state, retry };
}

/** Loading and error states. quiet: show nothing while loading (secondary blocks). */
export function SternikBankStatus({
  status,
  onRetry,
  quiet = false,
}: {
  status: 'loading' | 'error';
  onRetry: () => void;
  quiet?: boolean;
}) {
  const { tl } = useI18n();
  if (status === 'loading') {
    if (quiet) return null;
    return (
      <p role="status" aria-live="polite" data-testid="sternik-bank-loading" className="py-6 text-base" style={{ color: 'var(--text-secondary)' }}>
        {tl({
          ru: 'Загружаю базу вопросов...',
          en: 'Loading the question bank...',
          pl: 'Wczytywanie bazy pytań...',
          es: 'Cargando el banco de preguntas...',
          fr: 'Chargement de la banque de questions...',
          de: 'Fragenkatalog wird geladen...',
          it: 'Caricamento della banca delle domande...',
        })}
      </p>
    );
  }
  return (
    <div
      role="alert"
      data-testid="sternik-bank-error"
      className="mt-4 mb-4 rounded-xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--warning)' }}
    >
      <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {tl({
          ru: 'Не удалось загрузить вопросы.',
          en: 'Could not load the questions.',
          pl: 'Nie udało się wczytać pytań.',
          es: 'No se pudieron cargar las preguntas.',
          fr: 'Impossible de charger les questions.',
          de: 'Die Fragen konnten nicht geladen werden.',
          it: 'Impossibile caricare le domande.',
        })}
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tl({
          ru: 'Проверьте подключение и попробуйте ещё раз. Ваш прогресс сохранён на этом устройстве.',
          en: 'Check your connection and try again. Your progress is saved on this device.',
          pl: 'Sprawdź połączenie i spróbuj ponownie. Twoje postępy są zapisane na tym urządzeniu.',
          es: 'Comprueba la conexión y vuelve a intentarlo. Tu progreso está guardado en este dispositivo.',
          fr: 'Vérifiez votre connexion et réessayez. Votre progression est enregistrée sur cet appareil.',
          de: 'Prüfe die Verbindung und versuche es erneut. Dein Fortschritt ist auf diesem Gerät gespeichert.',
          it: 'Controlla la connessione e riprova. I tuoi progressi sono salvati su questo dispositivo.',
        })}
      </p>
      <button
        type="button"
        data-testid="sternik-bank-retry"
        onClick={onRetry}
        className="mt-3 min-h-[44px] rounded-lg px-4 text-sm font-semibold"
        style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
      >
        {tl({
          ru: 'Повторить',
          en: 'Try again',
          pl: 'Spróbuj ponownie',
          es: 'Reintentar',
          fr: 'Réessayer',
          de: 'Erneut versuchen',
          it: 'Riprova',
        })}
      </button>
    </div>
  );
}

/** Render children with the loaded bank; loading and error states otherwise. */
export default function SternikBankGate({
  children,
  quiet = false,
}: {
  children: (bank: SternikBank) => ReactNode;
  quiet?: boolean;
}) {
  const { state, retry } = useSternikBank();
  if (state.status === 'ready') return <>{children(state.bank)}</>;
  return <SternikBankStatus status={state.status} onRetry={retry} quiet={quiet} />;
}
