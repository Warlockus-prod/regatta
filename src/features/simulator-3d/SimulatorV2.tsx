'use client';

import { useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import type { SimLabels } from './types';

// Load the heavy three.js scene only on the client (keeps it out of SSR).
const Simulator3D = dynamic(() => import('./Simulator3D').then((m) => m.Simulator3D), { ssr: false });

// ============================================================================
// SimulatorV2 - the app-integrated wrapper around the standalone Simulator3D.
//
// This is the ONLY file in the module that touches Next.js and the app i18n.
// It localizes the labels and supplies the Basics/Trainer/3D switcher; the
// core Simulator3D stays portable. Remove this file (and use Simulator3D
// directly) to lift the module into another app.
//
// ?embed=1 (sent by the iOS app's WebView) hides the switcher and turns on the
// compact 100dvh layout so every control is reachable without page scroll -
// the WKWebView embeds these pages with page scrolling disabled.
// ============================================================================

function SimulatorV2Inner() {
  const { tp } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const embed = searchParams.get('embed') === '1';

  const labels: SimLabels = useMemo(
    () => ({
      badge: tp('ЛОДКА 3D', '3D BOAT', 'LODKA 3D', {
        es: 'BARCO 3D', fr: 'BATEAU 3D', de: 'BOOT 3D', it: 'BARCA 3D',
      }),
      orbitHint: tp('тяни мышью - орбита, колесо - зум', 'drag to orbit, wheel to zoom', 'przeciagnij - orbita, kolko - zoom', {
        es: 'arrastra - orbita, rueda - zoom', fr: 'glisser - orbite, molette - zoom', de: 'ziehen - Orbit, Rad - Zoom', it: 'trascina - orbita, rotella - zoom',
      }),
      modeFree: tp('Свободный трим', 'Free trim', 'Wolny trym', {
        es: 'Trimado libre', fr: 'Reglage libre', de: 'Freier Trimm', it: 'Regolazione libera',
      }),
      modeSail: tp('Ход под парусом', 'Sailing', 'Zeglowanie', {
        es: 'Navegando', fr: 'En navigation', de: 'Segeln', it: 'A vela',
      }),
      pointOfSail: tp('Точка курса', 'Point of sail', 'Kurs', {
        es: 'Rumbo', fr: 'Allure', de: 'Kurs zum Wind', it: 'Andatura',
      }),
      mainsheet: tp('Грота-шкот (гик)', 'Mainsheet (boom)', 'Grotszot (bom)', {
        es: 'Escota mayor', fr: 'Ecoute de GV', de: 'Grossschot', it: 'Scotta randa',
      }),
      jibsheet: tp('Стаксель-шкот', 'Jib sheet', 'Szot foka', {
        es: 'Escota de foque', fr: 'Ecoute de foc', de: 'Fockschot', it: 'Scotta fiocco',
      }),
      camber: tp('Пузо (камбер)', 'Draft (camber)', 'Brzuch', {
        es: 'Bolsa (camber)', fr: 'Creux (camber)', de: 'Bauch (Camber)', it: 'Grasso (camber)',
      }),
      twist: tp('Твист', 'Twist', 'Twist', { es: 'Twist', fr: 'Vrillage', de: 'Twist', it: 'Svergolamento' }),
      luffing: tp('Полоскание', 'Luffing', 'Lopotanie', {
        es: 'Flameo', fr: 'Faseyement', de: 'Killen', it: 'Fileggiare',
      }),
      reef: tp('Риф', 'Reef', 'Ref', { es: 'Rizo', fr: 'Ris', de: 'Reff', it: 'Terzarolo' }),
      rudder: tp('Руль', 'Rudder', 'Ster', { es: 'Timon', fr: 'Barre', de: 'Ruder', it: 'Timone' }),
      heel: tp('Крен', 'Heel', 'Przechyl', { es: 'Escora', fr: 'Gite', de: 'Kraengung', it: 'Sbandamento' }),
      helm: tp('Руль', 'Helm', 'Ster', { es: 'Timon', fr: 'Barre', de: 'Ruder', it: 'Timone' }),
      wind: tp('Ветер откуда', 'Wind from', 'Wiatr od', {
        es: 'Viento de', fr: 'Vent de', de: 'Wind aus', it: 'Vento da',
      }),
      windSpeed: tp('Сила ветра', 'Wind speed', 'Sila wiatru', {
        es: 'Fuerza del viento', fr: 'Force du vent', de: 'Windstaerke', it: 'Forza del vento',
      }),
      speed: tp('Скорость', 'Speed', 'Predkosc', { es: 'Velocidad', fr: 'Vitesse', de: 'Fahrt', it: 'Velocita' }),
      sound: tp('Звук', 'Sound', 'Dzwiek', { es: 'Sonido', fr: 'Son', de: 'Ton', it: 'Suono' }),
      bestVmg: tp('Лучший VMG', 'Best VMG', 'Najlepszy VMG', {
        es: 'Mejor VMG', fr: 'Meilleur VMG', de: 'Bestes VMG', it: 'Miglior VMG',
      }),
      reset: tp('Сброс', 'Reset', 'Reset', { es: 'Reiniciar', fr: 'Reinitialiser', de: 'Zuruecksetzen', it: 'Reset' }),
      presets: {
        luff: tp('Левентик', 'In irons', 'Leventik', { es: 'Proa al viento', fr: 'Bout au vent', de: 'Im Wind', it: 'Prua al vento' }),
        close: tp('Бейдевинд', 'Close-hauled', 'Bejdewind', { es: 'Cenida', fr: 'Pres', de: 'Am Wind', it: 'Bolina' }),
        beam: tp('Галфвинд', 'Beam reach', 'Galfwind', { es: 'Traves', fr: 'Travers', de: 'Halbwind', it: 'Traverso' }),
        broad: tp('Бакштаг', 'Broad reach', 'Baksztag', { es: 'Largo', fr: 'Largue', de: 'Raumschots', it: 'Lasco' }),
        run: tp('Фордевинд', 'Run', 'Forderwind', { es: 'Empopada', fr: 'Vent arriere', de: 'Vorwind', it: 'Poppa' }),
      },
      coach: {
        inIrons: tp('В левентике - увались, чтобы наполнить паруса', 'In irons - bear away to fill the sails', 'W leventiku - odpadnij, by napelnic zagle', {
          es: 'Proa al viento - arriba para llenar las velas', fr: 'Bout au vent - abats pour remplir les voiles', de: 'Im Wind - abfallen, um die Segel zu fuellen', it: 'Prua al vento - poggia per riempire le vele',
        }),
        luffEaseIn: tp('Полощет - выбери шкот или увались', 'Luffing - sheet in or bear away', 'Lopocze - wybierz szot lub odpadnij', {
          es: 'Flamea - caza o arriba', fr: 'Ca faseye - borde ou abats', de: 'Killt - dichtholen oder abfallen', it: 'Fileggia - caccia o poggia',
        }),
        stallEaseOut: tp('Перебор - потрави шкот', 'Stalled - ease the sheet', 'Przeciagniete - potraw szot', {
          es: 'Sobretrimado - amolla la escota', fr: 'Decroche - choque l\'ecoute', de: 'Stroemungsabriss - Schot fieren', it: 'Stallo - lasca la scotta',
        }),
        pinching: tp('Слишком круто - чуть увались', 'Pinching - bear away a touch', 'Za ostro - lekko odpadnij', {
          es: 'Muy cenido - arriba un poco', fr: 'Trop pres - abats un peu', de: 'Zu hoch - etwas abfallen', it: 'Troppo stretto - poggia un poco',
        }),
        good: tp('Хороший трим - оба паруса тянут', 'Well trimmed - both sails pulling', 'Dobry trym - oba zagle ciagna', {
          es: 'Buen trimado - ambas velas tiran', fr: 'Bien regle - les deux voiles portent', de: 'Gut getrimmt - beide Segel ziehen', it: 'Buona regolazione - entrambe le vele tirano',
        }),
        reachOn: tp('Настрой под галфвинд', 'Trim for the reach', 'Trymuj na galfwind', {
          es: 'Trima para el traves', fr: 'Regle pour le travers', de: 'Fuer Halbwind trimmen', it: 'Regola per il traverso',
        }),
        run: tp('Фордевинд - паруса травлены до конца', 'Running - sails eased right out', 'Forderwind - zagle wytrawione', {
          es: 'Empopada - velas totalmente amolladas', fr: 'Vent arriere - voiles choquees en grand', de: 'Vorwind - Segel ganz gefiert', it: 'In poppa - vele tutte lascate',
        }),
      },
    }),
    [tp],
  );

  const versions = useMemo(
    () => [
      {
        href: '/simulator',
        label: tp('Основы', 'Basics', 'Podstawy', { es: 'Basico', fr: 'Bases', de: 'Grundlagen', it: 'Base' }),
        title: tp('Ветер и повороты - шаг 1', 'Wind and turns - step 1', 'Wiatr i zwroty - krok 1', {
          es: 'Viento y giros - paso 1', fr: 'Vent et virements - etape 1', de: 'Wind und Wenden - Schritt 1', it: 'Vento e virate - passo 1',
        }),
      },
      {
        href: '/simulator-v3',
        label: tp('Тренажёр', 'Trainer', 'Trener', { es: 'Entrenador', fr: 'Entraineur', de: 'Trainer', it: 'Trainer' }),
        title: tp('Полный тренажёр трима - шаг 2', 'Full trim trainer - step 2', 'Pelny trener trymu - krok 2', {
          es: 'Entrenador completo - paso 2', fr: 'Entraineur complet - etape 2', de: 'Voller Trimm-Trainer - Schritt 2', it: 'Trainer completo - passo 2',
        }),
      },
      {
        href: '/simulator2',
        label: tp('Лодка 3D', '3D Boat', 'Lodka 3D', { es: 'Barco 3D', fr: 'Bateau 3D', de: 'Boot 3D', it: 'Barca 3D' }),
        title: tp('Орбита 360 и живые паруса', 'Orbit 360 and live sails', 'Orbita 360 i zywe zagle', {
          es: 'Orbita 360 y velas vivas', fr: 'Orbite 360 et voiles vivantes', de: 'Orbit 360 und lebende Segel', it: 'Orbita 360 e vele vive',
        }),
      },
    ],
    [tp],
  );

  const switcher = embed ? null : (
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
      <Simulator3D labels={labels} headerSlot={switcher} embed={embed} />
    </div>
  );
}

export default function SimulatorV2() {
  // useSearchParams requires a Suspense boundary in the app router.
  return (
    <Suspense fallback={null}>
      <SimulatorV2Inner />
    </Suspense>
  );
}
