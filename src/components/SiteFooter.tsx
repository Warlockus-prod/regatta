'use client';

// ============================================================================
// SiteFooter
//
// Tiny brand line that lives at the very bottom of every page. The wordmark
// is "Week to Regatta" - the project's full name (the in-app top-nav still
// shows the short "Regatta" because anything else would be heavy in a
// horizontal nav). Tagline is i18n'd in 7 languages.
//
// Hidden on immersive surfaces (game/multiplayer/simulator-v3) where the
// canvas owns the screen and any persistent UI competes with controls.
// ============================================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

const HIDE_PATHS = ['/game', '/multiplayer', '/simulator-v3'];

export default function SiteFooter() {
  const pathname = usePathname();
  const { tp } = useI18n();

  if (HIDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null;
  }

  const tagline = tp(
    'тренажёр парусного спорта',
    'sailing tutor',
    'symulator zeglarstwa',
    {
      es: 'simulador de vela',
      fr: 'simulateur de voile',
      de: 'Segelsimulator',
      it: 'simulatore di vela',
    },
  );

  return (
    <footer
      className="text-center text-[11px] py-6 px-4"
      style={{ color: 'var(--text-muted)' }}
      aria-label="Site brand"
    >
      <span className="font-semibold tracking-wide">Week to Regatta</span>
      <span className="mx-2 opacity-50">·</span>
      <span>{tagline}</span>
      <span className="mx-2 opacity-50">·</span>
      <Link href="/privacy" className="hover:text-[var(--accent-cyan)] transition">
        {tp('Конфиденциальность', 'Privacy', 'Prywatnosc',
          { es: 'Privacidad', fr: 'Confidentialite', de: 'Datenschutz', it: 'Privacy' })}
      </Link>
      <span className="mx-2 opacity-50">·</span>
      <Link href="/support" className="hover:text-[var(--accent-cyan)] transition">
        {tp('Контакты', 'Contact', 'Kontakt',
          { es: 'Contacto', fr: 'Contact', de: 'Kontakt', it: 'Contatti' })}
      </Link>
    </footer>
  );
}
