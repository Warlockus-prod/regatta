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
      freeModeHint: tp(
        'Здесь ты позируешь такелаж. Повернуть лодку и рулить - в режиме "Ход под парусом".',
        'Free trim poses the rig. To steer and turn the boat, switch to "Sailing".',
        'Tu ustawiasz takielunek. Aby sterowac i obracac lodke, przelacz na "Zeglowanie".',
        {
          es: 'Aqui posas el aparejo. Para gobernar y girar el barco, cambia a "Navegando".',
          fr: 'Ici tu poses le greement. Pour barrer et virer, passe en "En navigation".',
          de: 'Hier posierst du das Rigg. Zum Steuern und Wenden wechsle zu "Segeln".',
          it: 'Qui metti in posa l\'attrezzatura. Per governare e virare passa ad "A vela".',
        },
      ),
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
      steerLeft: tp('Руль влево', 'Steer left', 'Ster w lewo', {
        es: 'Timon a babor', fr: 'Barre a gauche', de: 'Ruder nach links', it: 'Timone a sinistra',
      }),
      steerRight: tp('Руль вправо', 'Steer right', 'Ster w prawo', {
        es: 'Timon a estribor', fr: 'Barre a droite', de: 'Ruder nach rechts', it: 'Timone a destra',
      }),
      tour: {
        open: tp('Гид', 'Guide', 'Przewodnik', { es: 'Guia', fr: 'Guide', de: 'Anleitung', it: 'Guida' }),
        next: tp('Дальше', 'Next', 'Dalej', { es: 'Siguiente', fr: 'Suivant', de: 'Weiter', it: 'Avanti' }),
        back: tp('Назад', 'Back', 'Wstecz', { es: 'Atras', fr: 'Retour', de: 'Zurueck', it: 'Indietro' }),
        done: tp('Понятно', 'Got it', 'Rozumiem', { es: 'Entendido', fr: 'Compris', de: 'Verstanden', it: 'Capito' }),
        steps: [
          {
            title: tp('Лодка 3D', '3D Boat', 'Lodka 3D', { es: 'Barco 3D', fr: 'Bateau 3D', de: 'Boot 3D', it: 'Barca 3D' }),
            body: tp(
              'Тяни сцену - орбита вокруг лодки, колесо или щипок - зум. Паруса, колдунчики и море - живые.',
              'Drag the scene to orbit the boat, pinch or scroll to zoom. Sails, telltales and the sea are live.',
              'Przeciagnij scene - orbita wokol lodki, kolko lub uszczypniecie - zoom. Zagle i morze sa zywe.',
              {
                es: 'Arrastra la escena para orbitar el barco, pellizca o rueda para zoom. Velas y mar estan vivos.',
                fr: 'Glisse la scene pour orbiter, pince ou molette pour zoomer. Voiles et mer sont vivantes.',
                de: 'Ziehe die Szene fuer den Orbit, kneifen oder Rad fuer Zoom. Segel und Meer sind lebendig.',
                it: 'Trascina la scena per orbitare, pizzica o rotella per lo zoom. Vele e mare sono vivi.',
              },
            ),
          },
          {
            title: tp('Руль', 'Steering', 'Ster', { es: 'Timon', fr: 'Barre', de: 'Ruder', it: 'Timone' }),
            body: tp(
              'Держи круглые кнопки по краям сцены (или стрелки влево/вправо на клавиатуре), чтобы поворачивать. Отпустишь - руль вернётся в 0. Слайдер - для точной настройки.',
              'Hold the round buttons at the scene edges (or the left/right arrow keys) to turn. Release and the helm returns to 0. The slider is for fine trim.',
              'Trzymaj okragle przyciski przy krawedziach sceny (lub strzalki na klawiaturze), aby skrecac. Po puszczeniu ster wraca do 0.',
              {
                es: 'Manten los botones redondos en los bordes (o las flechas del teclado) para girar. Al soltar, el timon vuelve a 0.',
                fr: 'Maintiens les boutons ronds aux bords (ou les fleches du clavier) pour virer. Relache et la barre revient a 0.',
                de: 'Halte die runden Knoepfe am Rand (oder die Pfeiltasten), um zu drehen. Loslassen - Ruder geht auf 0.',
                it: 'Tieni premuti i pulsanti rotondi ai bordi (o le frecce della tastiera) per virare. Al rilascio il timone torna a 0.',
              },
            ),
          },
          {
            title: tp('Шкоты', 'Sheets', 'Szoty', { es: 'Escotas', fr: 'Ecoutes', de: 'Schoten', it: 'Scotte' }),
            body: tp(
              'Трави грота- и стаксель-шкот, пока парус не начнёт полоскать, потом чуть подбери. Подсказка коуча - внизу сцены.',
              'Ease the main and jib sheets until the sail just starts to luff, then sheet back in a touch. The coach hint sits at the bottom.',
              'Luzuj szoty, az zagiel zacznie lopotac, potem lekko wybierz. Podpowiedz trenera jest na dole sceny.',
              {
                es: 'Amolla las escotas hasta que la vela flamee, luego caza un poco. El consejo del coach esta abajo.',
                fr: 'Choque les ecoutes jusqu au faseyement, puis borde un peu. Le conseil du coach est en bas.',
                de: 'Fiere die Schoten bis das Segel killt, dann etwas dichtholen. Der Coach-Hinweis steht unten.',
                it: 'Lasca le scotte finche la vela fileggia, poi caccia un poco. Il consiglio del coach e in basso.',
              },
            ),
          },
          {
            title: tp('Приборы', 'Instruments', 'Przyrzady', { es: 'Instrumentos', fr: 'Instruments', de: 'Instrumente', it: 'Strumenti' }),
            body: tp(
              'СКОРОСТЬ - твоя, TGT - цель при идеальном триме, VMG - продвижение к ветру. «Лучший VMG» - угол, на который стоит идти.',
              'SPEED is yours, TGT is the target at perfect trim, VMG is progress toward the wind. "Best VMG" is the angle worth sailing.',
              'PREDKOSC jest twoja, TGT to cel przy idealnym trymie, VMG to postep pod wiatr. "Najlepszy VMG" to kat, ktorym warto plynac.',
              {
                es: 'VELOCIDAD es la tuya, TGT el objetivo con trimado ideal, VMG el avance hacia el viento.',
                fr: 'VITESSE est la tienne, TGT la cible au reglage ideal, VMG la progression vers le vent.',
                de: 'FAHRT ist deine, TGT das Ziel bei idealem Trimm, VMG der Fortschritt gegen den Wind.',
                it: 'VELOCITA e la tua, TGT il target col trim ideale, VMG il progresso verso il vento.',
              },
            ),
          },
          {
            title: tp('Свободный трим', 'Free trim', 'Wolny trym', { es: 'Trimado libre', fr: 'Reglage libre', de: 'Freier Trimm', it: 'Regolazione libera' }),
            body: tp(
              'Второй режим - позирование такелажа: камбер, твист, риф. Вернуться к этому гиду можно кнопкой «?».',
              'The second mode poses the rig: camber, twist, reef. Reopen this guide anytime with the "?" button.',
              'Drugi tryb to ustawianie takielunku: brzuch, twist, ref. Wroc do przewodnika przyciskiem "?".',
              {
                es: 'El segundo modo posa el aparejo: bolsa, twist, rizo. Reabre esta guia con el boton "?".',
                fr: 'Le second mode pose le greement : creux, vrillage, ris. Rouvre ce guide avec le bouton "?".',
                de: 'Der zweite Modus posiert das Rigg: Bauch, Twist, Reff. Oeffne die Anleitung mit "?" erneut.',
                it: 'La seconda modalita mette in posa l attrezzatura: grasso, twist, terzaroli. Riapri la guida con "?".',
              },
            ),
          },
        ],
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
      <Simulator3D labels={labels} headerSlot={switcher} embed={embed} initialMode="sail" />
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
