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
  const mainSet = ui.sailsRaised !== 'jib';
  const jibSet = ui.sailsRaised !== 'main' && ui.jibFurlPct > 0;

  // -------- CRITICAL --------
  // Threshold matches the drawn no-go cone (NO_GO_HALF_DEG from the shared
  // physics constants) so the message and the red sector agree.
  if (absTwa < NO_GO_HALF_DEG) {
    return {
      text: tp(
        'Слишком близко к ветру. Уваливайся, чтобы восстановить ход.',
        'Too close to the wind. Bear away to recover speed.',
        'Za ostro do wiatru. Odpadnij, żeby odzyskać prędkość.',
        {
          es: 'Demasiado cerca del viento. Arriba para recuperar velocidad.',
          fr: "Trop près du vent. Abats pour reprendre de la vitesse.",
          de: 'Zu nah am Wind. Fall ab, um wieder Fahrt aufzunehmen.',
          it: 'Troppo vicino al vento. Poggia per riprendere velocità.',
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
        'Krytyczny przechył. Refuj TERAZ.',
        {
          es: 'Escora crítica. Toma un rizo YA.',
          fr: 'Gîte critique. Prends un ris MAINTENANT.',
          de: 'Krängung kritisch. JETZT reffen.',
          it: 'Sbandamento critico. Terzarola SUBITO.',
        },
      ),
      tone: 'danger',
    };
  }
  if (mainSet && diag.mainStalled && heelAbs > 22 && absTwa < 135) {
    return {
      text: tp(
        'Срыв грота + большой крен. Ослабь шкот и рифься.',
        'Main stalled and heeling hard. Ease the main and reef.',
        'Oderwanie przepływu na grocie i duży przechył. Poluzuj szot i refuj.',
        {
          es: 'Flujo desprendido en la mayor y mucha escora. Lasca la escota y toma un rizo.',
          fr: "GV décrochée et forte gîte. Choque l'écoute et prends un ris.",
          de: 'Strömungsabriss am Groß und starke Krängung. Schot fieren und reffen.',
          it: 'Randa in stallo e forte sbandamento. Lasca la scotta e terzarola.',
        },
      ),
      tone: 'danger',
    };
  }

  // -------- WARNING --------
  if (mainSet && diag.mainStalled && absTwa < 135) {
    const tail = trimDelta > TRIM_RISING
      ? tp(' Уже лучше.', ' Recovering.', ' Już lepiej.', {
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
        'Grot za mocno wybrany: przepływ się oderwał.' + tail,
        {
          es: 'Mayor demasiado cazada: el flujo se ha desprendido.' + tail,
          fr: "GV trop bordée : l'écoulement a décroché." + tail,
          de: 'Groß zu dicht: Strömung abgerissen.' + tail,
          it: 'Randa troppo cazzata: il flusso si è staccato.' + tail,
        },
      ),
      tone: 'warn',
    };
  }
  if (jibSet && diag.jibStalled && ui.jibFurlPct > 20 && absTwa < 135) {
    return {
      text: tp(
        'Стаксель перетянут и душит слот.',
        'Jib is overtrimmed and choking the slot.',
        'Fok za mocno wybrany: zamyka szczelinę.',
        {
          es: 'Foque demasiado cazado: cierra la ranura.',
          fr: 'Foc trop bordé : il ferme la fente.',
          de: 'Fock zu dicht: sie schließt den Spalt.',
          it: 'Fiocco troppo cazzato: chiude la fessura.',
        },
      ),
      tone: 'warn',
    };
  }
  if (heelAbs > 22 && ui.windSpeed >= 16 && ui.reefLevel === 0) {
    const heelRound = Math.round(heelAbs);
    const tail = heelDelta > HEEL_RISING
      ? tp(' и растёт', ' and rising', ' i rośnie', {
          es: ' y subiendo',
          fr: ' en hausse',
          de: ' und steigt',
          it: ' e cresce',
        })
      : heelDelta < HEEL_FALLING
      ? tp(' оседает', ' settling', ' i maleje', {
          es: ' y bajando',
          fr: ' en baisse',
          de: ' geht zurück',
          it: ' in calo',
        })
      : '';
    return {
      text: tp(
        `Крен ${heelRound}°${tail}. Пора рифиться.`,
        `Heel ${heelRound}°${tail}. Reef time.`,
        `Przechył ${heelRound}°${tail}. Czas refować.`,
        {
          es: `Escora ${heelRound}°${tail}. Hora de tomar un rizo.`,
          fr: `Gîte ${heelRound}°${tail}. Il est temps de prendre un ris.`,
          de: `Krängung ${heelRound}°${tail}. Zeit zu reffen.`,
          it: `Sbandamento ${heelRound}°${tail}. È ora di terzarolare.`,
        },
      ),
      tone: 'warn',
    };
  }
  if ((mainSet || jibSet) && (!mainSet || diag.mainAoA < 5) && (!jibSet || diag.jibAoA < 5)) {
    return {
      text: tp(
        'Паруса полощут - подтяни шкоты.',
        'Sails are luffing - sheet in.',
        'Żagle łopoczą: wybierz szoty.',
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
        'Duży dryf: kil już nie trzyma.',
        {
          es: 'Mucho abatimiento: la quilla ya no aguanta.',
          fr: 'Forte dérive : la quille ne tient plus.',
          de: 'Starke Abdrift: der Kiel hält nicht mehr.',
          it: 'Forte scarroccio: la chiglia non tiene più.',
        },
      ),
      tone: 'warn',
    };
  }

  // -------- EDGE --------
  if (mainSet && diag.mainAoA >= 15 && absTwa < 135) {
    return {
      text: tp(
        'Грот у грани срыва. Не тяни сильнее.',
        'Main is on the edge of stall. Do not sheet harder.',
        'Grot na granicy oderwania przepływu. Nie wybieraj mocniej.',
        {
          es: 'La mayor está al borde del desprendimiento. No caces más.',
          fr: 'La GV est au bord du décrochage. Ne borde pas plus.',
          de: 'Groß kurz vor dem Strömungsabriss. Nicht weiter dichtholen.',
          it: 'La randa è al limite dello stallo. Non cazzare oltre.',
        },
      ),
      tone: 'info',
    };
  }
  if (jibSet && diag.jibAoA >= 15 && ui.jibFurlPct > 30 && absTwa < 135) {
    return {
      text: tp(
        'Стаксель у грани срыва.',
        'Jib is on the edge of stall.',
        'Fok na granicy oderwania przepływu.',
        {
          es: 'El foque está al borde del desprendimiento.',
          fr: 'Le foc est au bord du décrochage.',
          de: 'Fock kurz vor dem Strömungsabriss.',
          it: 'Il fiocco è al limite dello stallo.',
        },
      ),
      tone: 'info',
    };
  }
  if (mainSet && jibSet && diag.slotHealth < 0.4 && ui.jibFurlPct > 20 && absTwa < 130) {
    return {
      text: tp(
        'Слот закрывается - ослабь стаксель.',
        'Slot is closing - ease the jib.',
        'Szczelina się zamyka: poluzuj szot foka.',
        {
          es: 'La ranura se cierra: lasca el foque.',
          fr: 'La fente se ferme : choque le foc.',
          de: 'Der Spalt schließt sich: Fock fieren.',
          it: 'La fessura si chiude: lasca il fiocco.',
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
        'Przechył rośnie, prędkość spada.',
        {
          es: 'La escora sube, la velocidad cae.',
          fr: 'La gîte monte, la vitesse tombe.',
          de: 'Krängung steigt, Fahrt fällt.',
          it: 'Lo sbandamento cresce, la velocità cala.',
        },
      ),
      tone: 'info',
    };
  }

  // -------- HEALTHY --------
  if (mainSet && jibSet && diag.slotHealth > 0.7 && absTwa < 130 && !diag.mainStalled && !diag.jibStalled) {
    const tail = trimDelta > TRIM_RISING
      ? tp(' Разгоняемся.', ' Picking up.', ' Przyspieszamy.', {
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
        'Szczelina w porządku: oba żagle pracują.' + tail,
        {
          es: 'Buena ranura: las dos velas tiran.' + tail,
          fr: 'Bonne fente : les deux voiles portent.' + tail,
          de: 'Guter Spalt: beide Segel ziehen.' + tail,
          it: 'Buona fessura: entrambe le vele tirano.' + tail,
        },
      ),
      tone: 'good',
    };
  }
  if (state.boatSpeed >= 5 && heelAbs < 20 && !diag.mainStalled && !diag.jibStalled) {
    const tail = trimDelta > TRIM_RISING
      ? tp(' Держи так.', ' Hold it.', ' Tak trzymaj.', {
          es: ' Mantenlo así.',
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
          es: 'El trimado está cerca del óptimo.' + tail,
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
      'Zmieniaj ustawienia i obserwuj prędkość oraz przechył.',
      {
        es: 'Mueve los controles y observa velocidad y escora.',
        fr: 'Bouge les commandes et surveille vitesse et gîte.',
        de: 'Beweg die Regler und beobachte Fahrt und Krängung.',
        it: 'Muovi i controlli e osserva velocità e sbandamento.',
      },
    ),
    tone: 'info',
  };
}
