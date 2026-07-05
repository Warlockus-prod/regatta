import { type PointOfSail } from '@/data/sailing-data';
import { NO_GO_HALF_DEG, type TickResult } from '@/lib/sailing-physics';
import { type FeedbackTone, type TpFn, type UiState } from '../ui/shared';

// ---------------------------------------------------------------------------
// Commentary picker (PR-5 rewrite).
//
// Four levels, in priority order:
// - CRITICAL: immediate trouble (no-go, heel over the edge, stall + heel
//   together). Mapped to the `danger` tone.
// - WARNING:  a real problem that needs fixing in seconds (single stall,
//   over-heel in heavy air, luffing, runaway leeway). Mapped to `warn`.
// - EDGE:     approaching a problem - flow near separation, slot closing.
//   Mapped to `info` so the strip glows cyan-ish (attention, not alarm).
// - HEALTHY:  everything fine (slot healthy, trim near optimum). `good`.
//
// Delta suffixes: when the caller provides `trimDelta` / `heelDelta` over
// ~1.5 s, the picker can append a short "улучшается / растёт / ..." tail to
// a handful of messages so the commentary reads the direction of travel.
// Trend data is optional - callers that do not track it pass undefined and
// get the plain strings.
//
// The first match wins, so CRITICAL short-circuits before WARNING etc.
//
// i18n: every message carries all 7 languages via the tp extras pack
// (es/fr/de/it). Nautical terms follow each language's convention:
// ES cenida/traves/escora, FR pres/travers/gite, DE Am-Wind/Kraengung,
// IT bolina/traverso/sbandamento.
// ---------------------------------------------------------------------------

export interface FeedbackInput {
  ui: UiState;
  result: TickResult;
  pos: PointOfSail;
  absTwa: number;
  tp: TpFn;
  /** Trim score change over the sampling window (percent points). */
  trimDelta?: number;
  /** Absolute heel change over the sampling window (degrees). */
  heelDelta?: number;
}

const TRIM_RISING = 3;
const TRIM_FALLING = -3;
const HEEL_RISING = 2;
const HEEL_FALLING = -2;

export function pickPrimaryFeedback(args: FeedbackInput): {
  text: string;
  tone: FeedbackTone;
} {
  const { ui, result, absTwa, tp, trimDelta = 0, heelDelta = 0 } = args;
  const { diag, state } = result;
  const heelAbs = Math.abs(state.heel);

  // -------- CRITICAL --------
  // Threshold matches the drawn no-go cone (NO_GO_HALF_DEG from the shared
  // physics constants) so the message and the red sector agree.
  if (absTwa < NO_GO_HALF_DEG) {
    return {
      text: tp(
        'В мёртвой зоне. Уваливайся - лодка встала.',
        'No-go zone. Bear away, the boat has stopped.',
        'Strefa martwa. Zejdz od wiatru.',
        {
          es: 'Zona muerta. Arriba: el barco se ha parado.',
          fr: "Zone morte. Abats, le bateau s'est arrêté.",
          de: 'Totzone. Fall ab, das Boot steht.',
          it: 'Zona morta. Poggia: la barca si è fermata.',
        },
      ),
      tone: 'danger',
    };
  }
  if (heelAbs > 28 && ui.windSpeed >= 16 && ui.reefLevel === 0) {
    return {
      text: tp(
        'Крен критический. Риф СЕЙЧАС.',
        'Heel is critical. Reef NOW.',
        'Przechyl krytyczny. Refa, juz.',
        {
          es: 'Escora crítica. Riza YA.',
          fr: 'Gîte critique. Prends un ris MAINTENANT.',
          de: 'Kraengung kritisch. JETZT reffen.',
          it: 'Sbandamento critico. Terzarola SUBITO.',
        },
      ),
      tone: 'danger',
    };
  }
  if (diag.mainStalled && heelAbs > 22) {
    return {
      text: tp(
        'Срыв грота + большой крен. Ослабь шкот и рифься.',
        'Main stalled and heeling hard. Ease the main and reef.',
        'Grot zerwany i duzy przechyl. Popusc i refuj.',
        {
          es: 'Mayor en stall y mucha escora. Lasca la escota y riza.',
          fr: "GV décrochée et forte gîte. Choque l'écoute et prends un ris.",
          de: 'Gross im Stall und starke Kraengung. Schot fieren und reffen.',
          it: 'Randa in stallo e forte sbandamento. Lasca la scotta e terzarola.',
        },
      ),
      tone: 'danger',
    };
  }

  // -------- WARNING --------
  if (diag.mainStalled) {
    const tail = trimDelta > TRIM_RISING
      ? tp(' Уже лучше.', ' Recovering.', ' Poprawia sie.', {
          es: ' Se recupera.',
          fr: ' Ça revient.',
          de: ' Wird besser.',
          it: ' Si riprende.',
        })
      : '';
    return {
      text: tp(
        'Грот перетянут - поток сорвался.' + tail,
        'Main overtrimmed - flow has detached.' + tail,
        'Grot przebrany - przeplyw oderwany.' + tail,
        {
          es: 'Mayor sobretrimada: el flujo se ha desprendido.' + tail,
          fr: "GV surbordée : l'écoulement a décroché." + tail,
          de: 'Gross zu dicht - Stroemung abgerissen.' + tail,
          it: 'Randa troppo cazzata: il flusso si è staccato.' + tail,
        },
      ),
      tone: 'warn',
    };
  }
  if (diag.jibStalled && ui.jibFurlPct > 20) {
    return {
      text: tp(
        'Стаксель перетянут и душит слот.',
        'Jib is overtrimmed and choking the slot.',
        'Fok przebrany - dusi slot.',
        {
          es: 'Foque sobretrimado: ahoga el slot.',
          fr: 'Foc surbordé : il étouffe le slot.',
          de: 'Fock zu dicht - sie erstickt den Slot.',
          it: 'Fiocco troppo cazzato: soffoca lo slot.',
        },
      ),
      tone: 'warn',
    };
  }
  if (heelAbs > 22 && ui.windSpeed >= 16 && ui.reefLevel === 0) {
    const heelRound = Math.round(heelAbs);
    const tail = heelDelta > HEEL_RISING
      ? tp(' и растёт', ' and rising', ' i rosnie', {
          es: ' y subiendo',
          fr: ' et ça monte',
          de: ' und steigt',
          it: ' e cresce',
        })
      : heelDelta < HEEL_FALLING
      ? tp(' оседает', ' settling', ' opada', {
          es: ' bajando',
          fr: ' ça retombe',
          de: ' geht zurueck',
          it: ' cala',
        })
      : '';
    return {
      text: tp(
        `Крен ${heelRound}°${tail}. Пора рифиться.`,
        `Heel ${heelRound}°${tail}. Reef time.`,
        `Przechyl ${heelRound}°${tail}. Czas refic.`,
        {
          es: `Escora ${heelRound}°${tail}. Hora de rizar.`,
          fr: `Gîte ${heelRound}°${tail}. C'est l'heure du ris.`,
          de: `Kraengung ${heelRound}°${tail}. Zeit zu reffen.`,
          it: `Sbandamento ${heelRound}°${tail}. Ora di terzarolare.`,
        },
      ),
      tone: 'warn',
    };
  }
  if (diag.mainAoA < 5 && diag.jibAoA < 5) {
    return {
      text: tp(
        'Паруса полощут - подтяни шкоты.',
        'Sails are luffing - sheet in.',
        'Zagle lopoczaz - wybierz szoty.',
        {
          es: 'Las velas flamean: caza las escotas.',
          fr: 'Les voiles faseyent : borde les écoutes.',
          de: 'Die Segel killen - Schoten dichtholen.',
          it: 'Le vele fileggiano: cazza le scotte.',
        },
      ),
      tone: 'warn',
    };
  }
  if (Math.abs(state.leeway) > 7) {
    return {
      text: tp(
        'Большой снос, киль уже не держит.',
        'Heavy sideways drift - keel saturated.',
        'Duzy dryf, kil utracil przyczepnosc.',
        {
          es: 'Mucho abatimiento: la quilla ya no aguanta.',
          fr: 'Forte dérive : la quille sature.',
          de: 'Starke Abdrift - der Kiel haelt nicht mehr.',
          it: 'Forte scarroccio: la chiglia non tiene più.',
        },
      ),
      tone: 'warn',
    };
  }

  // -------- EDGE --------
  if (diag.mainAoA >= 15) {
    return {
      text: tp(
        'Грот у грани срыва. Не тяни сильнее.',
        'Main is on the edge of stall. Do not sheet harder.',
        'Grot na krawedzi zerwania.',
        {
          es: 'La mayor está al borde del stall. No caces más.',
          fr: 'La GV est au bord du décrochage. Ne borde pas plus.',
          de: 'Gross kurz vor dem Stall. Nicht weiter dichtholen.',
          it: 'La randa è al limite dello stallo. Non cazzare oltre.',
        },
      ),
      tone: 'info',
    };
  }
  if (diag.jibAoA >= 15 && ui.jibFurlPct > 30) {
    return {
      text: tp(
        'Стаксель у грани срыва.',
        'Jib is on the edge of stall.',
        'Fok na krawedzi zerwania.',
        {
          es: 'El foque está al borde del stall.',
          fr: 'Le foc est au bord du décrochage.',
          de: 'Fock kurz vor dem Stall.',
          it: 'Il fiocco è al limite dello stallo.',
        },
      ),
      tone: 'info',
    };
  }
  if (diag.slotHealth < 0.4 && ui.jibFurlPct > 20 && absTwa < 130) {
    return {
      text: tp(
        'Слот закрывается - ослабь стаксель.',
        'Slot is closing - ease the jib.',
        'Slot sie zamyka - popusc foka.',
        {
          es: 'El slot se cierra: lasca el foque.',
          fr: 'Le slot se ferme : choque le foc.',
          de: 'Der Slot schliesst sich - Fock fieren.',
          it: 'Lo slot si chiude: lasca il fiocco.',
        },
      ),
      tone: 'info',
    };
  }
  if (heelAbs > 20 && trimDelta < TRIM_FALLING) {
    return {
      text: tp(
        'Крен растёт, скорость падает.',
        'Heel building, speed dropping.',
        'Przechyl rosnie, predkosc spada.',
        {
          es: 'La escora sube, la velocidad cae.',
          fr: 'La gîte monte, la vitesse tombe.',
          de: 'Kraengung steigt, Fahrt faellt.',
          it: 'Lo sbandamento cresce, la velocità cala.',
        },
      ),
      tone: 'info',
    };
  }

  // -------- HEALTHY --------
  if (diag.slotHealth > 0.7 && absTwa < 130 && !diag.mainStalled && !diag.jibStalled) {
    const tail = trimDelta > TRIM_RISING
      ? tp(' Разгоняемся.', ' Picking up.', ' Rozpedza sie.', {
          es: ' Acelerando.',
          fr: ' Ça accélère.',
          de: ' Nimmt Fahrt auf.',
          it: ' Sta accelerando.',
        })
      : trimDelta < TRIM_FALLING
      ? tp(' Но теряем.', ' But slipping.', ' Ale tracimy.', {
          es: ' Pero perdemos.',
          fr: ' Mais on perd.',
          de: ' Aber wir verlieren.',
          it: ' Ma stiamo perdendo.',
        })
      : '';
    return {
      text: tp(
        'Слот здоров - оба паруса тянут.' + tail,
        'Slot is healthy - both sails pulling.' + tail,
        'Slot zdrowy - oba zagle ciagna.' + tail,
        {
          es: 'Slot sano: ambas velas tiran.' + tail,
          fr: 'Slot sain : les deux voiles portent.' + tail,
          de: 'Slot gesund - beide Segel ziehen.' + tail,
          it: 'Slot sano: entrambe le vele tirano.' + tail,
        },
      ),
      tone: 'good',
    };
  }
  if (state.boatSpeed >= 5 && heelAbs < 20 && !diag.mainStalled && !diag.jibStalled) {
    const tail = trimDelta > TRIM_RISING
      ? tp(' Держи так.', ' Hold it.', ' Trzymaj.', {
          es: ' Mantenlo.',
          fr: ' Tiens bon.',
          de: ' So halten.',
          it: ' Tieni così.',
        })
      : '';
    return {
      text: tp(
        'Настройка близка к оптимуму.' + tail,
        'Trim is near optimal.' + tail,
        'Trym bliski optymalnego.' + tail,
        {
          es: 'El trimado está cerca del optimo.' + tail,
          fr: 'Le réglage est proche de l\'optimum.' + tail,
          de: 'Der Trimm ist nahe am Optimum.' + tail,
          it: 'Il trim è vicino all\'ottimo.' + tail,
        },
      ),
      tone: 'good',
    };
  }

  return {
    text: tp(
      'Крути контролы и смотри на скорость и крен.',
      'Move the controls and watch speed and heel.',
      'Ruszaj slajdery, patrz na predkosc i przechyl.',
      {
        es: 'Mueve los controles y observa velocidad y escora.',
        fr: 'Bouge les commandes et surveille vitesse et gîte.',
        de: 'Beweg die Regler und beobachte Fahrt und Kraengung.',
        it: 'Muovi i controlli e osserva velocità e sbandamento.',
      },
    ),
    tone: 'info',
  };
}
