'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import type { SimLabels } from './types';

// Load the heavy three.js scene only on the client (keeps it out of SSR).
const Simulator3D = dynamic(() => import('./Simulator3D').then((m) => m.Simulator3D), { ssr: false });

// ============================================================================
// SimulatorV2 - the app-integrated wrapper around the standalone Simulator3D.
//
// This is the ONLY file in the module that touches Next.js and the app i18n.
// It localizes the labels and supplies the V1/V2/V3 version switcher; the core
// Simulator3D stays portable. Remove this file (and use Simulator3D directly)
// to lift the module into another app.
// ============================================================================

export default function SimulatorV2() {
  const { tp } = useI18n();
  const pathname = usePathname();

  const labels: SimLabels = useMemo(
    () => ({
      badge: tp('СИМУЛЯТОР V2 - 3D', 'SIMULATOR V2 - 3D', 'SYMULATOR V2 - 3D'),
      orbitHint: tp('тяни мышью - орбита, колесо - зум', 'drag to orbit, wheel to zoom', 'przeciagnij - orbita, kolko - zoom'),
      modeFree: tp('Свободный трим', 'Free trim', 'Wolny trym'),
      modeSail: tp('Ход под парусом', 'Sailing', 'Zeglowanie'),
      pointOfSail: tp('Точка курса', 'Point of sail', 'Kurs'),
      mainsheet: tp('Грота-шкот (гик)', 'Mainsheet (boom)', 'Grotszot (bom)'),
      jibsheet: tp('Стаксель-шкот', 'Jib sheet', 'Szot foka'),
      camber: tp('Пузо (камбер)', 'Draft (camber)', 'Brzuch'),
      twist: tp('Твист', 'Twist', 'Twist'),
      luffing: tp('Полоскание', 'Luffing', 'Lopotanie'),
      reef: tp('Риф', 'Reef', 'Ref'),
      rudder: tp('Руль', 'Rudder', 'Ster'),
      heel: tp('Крен', 'Heel', 'Przechyl'),
      helm: tp('Руль', 'Helm', 'Ster'),
      wind: tp('Ветер откуда', 'Wind from', 'Wiatr od'),
      windSpeed: tp('Сила ветра', 'Wind speed', 'Sila wiatru'),
      speed: tp('Скорость', 'Speed', 'Predkosc'),
      sound: tp('Звук', 'Sound', 'Dzwiek'),
      bestVmg: tp('Лучший VMG', 'Best VMG', 'Najlepszy VMG'),
      reset: tp('Сброс', 'Reset', 'Reset'),
      presets: {
        luff: tp('Левентик', 'In irons', 'Leventik'),
        close: tp('Бейдевинд', 'Close-hauled', 'Bejdewind'),
        beam: tp('Галфвинд', 'Beam reach', 'Galfwind'),
        broad: tp('Бакштаг', 'Broad reach', 'Baksztag'),
        run: tp('Фордевинд', 'Run', 'Forderwind'),
      },
      coach: {
        inIrons: tp('В левентике - увались, чтобы наполнить паруса', 'In irons - bear away to fill the sails', 'W leventiku - odpadnij, by napelnic zagle'),
        luffEaseIn: tp('Полощет - выбери шкот или увались', 'Luffing - sheet in or bear away', 'Lopocze - wybierz szot lub odpadnij'),
        stallEaseOut: tp('Перебор - потрави шкот', 'Stalled - ease the sheet', 'Przeciagniete - potraw szot'),
        pinching: tp('Слишком круто - чуть увались', 'Pinching - bear away a touch', 'Za ostro - lekko odpadnij'),
        good: tp('Хороший трим - оба паруса тянут', 'Well trimmed - both sails pulling', 'Dobry trym - oba zagle ciagna'),
        reachOn: tp('Настрой под галфвинд', 'Trim for the reach', 'Trymuj na galfwind'),
        run: tp('Фордевинд - паруса травлены до конца', 'Running - sails eased right out', 'Forderwind - zagle wytrawione'),
      },
    }),
    [tp],
  );

  const versions = useMemo(
    () => [
      { href: '/simulator', label: 'V1', title: tp('2D, вид сверху', '2D top-down', '2D z gory') },
      { href: '/simulator2', label: 'V2', title: tp('3D лодка', '3D boat', '3D lodka') },
      { href: '/simulator-v3', label: 'V3', title: tp('Трим-тренажёр', 'Trim trainer', 'Trener trymu') },
    ],
    [tp],
  );

  const switcher = (
    <div className="flex gap-1">
      {versions.map((v) => {
        const active = pathname === v.href;
        return (
          <Link
            key={v.href}
            href={v.href}
            title={v.title}
            className={
              'rounded-md px-3 py-1 text-sm font-semibold transition ' +
              (active
                ? 'bg-[var(--accent-cyan,#00d4ff)] text-[#04222d]'
                : 'border border-[rgba(255,255,255,0.12)] text-[var(--text-secondary,#9fb6c4)] hover:border-[rgba(0,212,255,0.4)]')
            }
          >
            {v.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#0a1118)] text-[var(--text-primary,#e7f1f7)]">
      <Simulator3D labels={labels} headerSlot={switcher} />
    </div>
  );
}
