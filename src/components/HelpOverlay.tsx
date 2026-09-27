'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/languages';

interface ShortcutItem {
  keys: string[];
  ru: string;
  en: string;
  pl: string;
  es?: string;
  fr?: string;
  de?: string;
  it?: string;
}

interface ShortcutGroup {
  ru: string;
  en: string;
  pl: string;
  es?: string;
  fr?: string;
  de?: string;
  it?: string;
  items: ShortcutItem[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    ru: 'Симулятор',
    en: 'Simulator',
    pl: 'Symulator',
    es: 'Simulador',
    fr: 'Simulateur',
    de: 'Simulator',
    it: 'Simulatore',
    items: [
      {
        keys: ['← →', 'A / D'],
        ru: 'Повернуть яхту',
        en: 'Steer the boat',
        pl: 'Steruj jachtem',
        es: 'Gobernar el velero',
        fr: 'Barrer le voilier',
        de: 'Boot steuern',
        it: 'Governare la barca',
      },
      {
        keys: ['↑ ↓', 'W / S'],
        ru: 'Изменить направление ветра',
        en: 'Change wind direction',
        pl: 'Zmień kierunek wiatru',
        es: 'Cambiar la dirección del viento',
        fr: 'Changer la direction du vent',
        de: 'Windrichtung ändern',
        it: 'Cambiare la direzione del vento',
      },
      {
        keys: ['🖱'],
        ru: 'Тянуть за яхту или за ветер на кольце',
        en: 'Drag the boat or the wind on the dial',
        pl: 'Przeciągnij jacht lub wiatr na pierścieniu',
        es: 'Arrastra el velero o el viento en el anillo',
        fr: 'Tire le voilier ou le vent sur le cadran',
        de: 'Boot oder Wind am Ring ziehen',
        it: 'Trascina la barca o il vento sull\'anello',
      },
    ],
  },
  {
    ru: 'Игра',
    en: 'Game',
    pl: 'Gra',
    es: 'Juego',
    fr: 'Jeu',
    de: 'Spiel',
    it: 'Gioco',
    items: [
      {
        keys: ['← →', 'A / D'],
        ru: 'Повернуть яхту',
        en: 'Steer the boat',
        pl: 'Steruj jachtem',
        es: 'Gobernar el velero',
        fr: 'Barrer le voilier',
        de: 'Boot steuern',
        it: 'Governare la barca',
      },
      {
        keys: ['AUTO'],
        ru: 'Автопилот - держит курс',
        en: 'Autopilot - holds course',
        pl: 'Autopilot - utrzymuje kurs',
        es: 'Piloto automático - mantiene el rumbo',
        fr: 'Pilote automatique - tient le cap',
        de: 'Autopilot - hält den Kurs',
        it: 'Pilota automatico - tiene la rotta',
      },
      {
        keys: ['🔊'],
        ru: 'Звук вкл/выкл',
        en: 'Sound on/off',
        pl: 'Dźwięk wł./wył.',
        es: 'Sonido on/off',
        fr: 'Son on/off',
        de: 'Ton an/aus',
        it: 'Audio on/off',
      },
    ],
  },
  {
    ru: 'Везде',
    en: 'Everywhere',
    pl: 'Wszędzie',
    es: 'En todas partes',
    fr: 'Partout',
    de: 'Überall',
    it: 'Ovunque',
    items: [
      {
        keys: ['?'],
        ru: 'Эта справка',
        en: 'This help',
        pl: 'Ta pomoc',
        es: 'Esta ayuda',
        fr: 'Cette aide',
        de: 'Diese Hilfe',
        it: 'Questa guida',
      },
      {
        keys: ['Esc'],
        ru: 'Закрыть диалог',
        en: 'Close dialog',
        pl: 'Zamknij okno',
        es: 'Cerrar el diálogo',
        fr: 'Fermer la fenêtre',
        de: 'Dialog schließen',
        it: 'Chiudi finestra',
      },
    ],
  },
];

/**
 * Pick the localized field with EN as the universal fallback for any of the
 * four "newer" languages (es/fr/de/it) and RU when explicitly requested.
 */
function pickL(obj: ShortcutItem | ShortcutGroup, lang: Lang): string {
  switch (lang) {
    case 'ru': return obj.ru;
    case 'pl': return obj.pl;
    case 'es': return obj.es ?? obj.en;
    case 'fr': return obj.fr ?? obj.en;
    case 'de': return obj.de ?? obj.en;
    case 'it': return obj.it ?? obj.en;
    default:   return obj.en;
  }
}

export default function HelpOverlay() {
  const { lang, tp } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't trigger when typing in an input
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setOpen((o) => !o);
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Expose a global opener so nav button can trigger it
  useEffect(() => {
    (window as unknown as { __openHelp?: () => void }).__openHelp = () => setOpen(true);
    return () => {
      delete (window as unknown as { __openHelp?: () => void }).__openHelp;
    };
  }, []);

  if (!open) return null;

  const title = tp('Горячие клавиши', 'Keyboard shortcuts', 'Skróty klawiszowe',
    { es: 'Atajos de teclado', fr: 'Raccourcis clavier', de: 'Tastenkürzel', it: 'Scorciatoie da tastiera' });
  const closeLabel = tp('Закрыть', 'Close', 'Zamknij',
    { es: 'Cerrar', fr: 'Fermer', de: 'Schließen', it: 'Chiudi' });

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 12, 24, 0.75)', backdropFilter: 'blur(6px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="card max-w-lg w-full max-w-[100vw] p-6 max-h-[80vh] overflow-y-auto min-w-0"
        onClick={(e) => e.stopPropagation()}
        style={{ border: '1px solid rgba(0, 212, 255, 0.3)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={() => setOpen(false)}
            aria-label={closeLabel}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          {SHORTCUTS.map((group, gi) => (
            <div key={gi}>
              <div className="text-xs font-semibold tracking-wider text-[var(--accent-cyan)] mb-2">
                {pickL(group, lang).toUpperCase()}
              </div>
              <div className="space-y-1.5">
                {group.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">{pickL(it, lang)}</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {it.keys.map((k, j) => (
                        <kbd key={j} className="px-2 py-0.5 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono text-[var(--text-primary)]">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
