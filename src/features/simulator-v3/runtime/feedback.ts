import { type PointOfSail } from '@/data/sailing-data';
import { type TickResult } from '@/lib/sailing-physics';
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
  if (absTwa < 30) {
    return {
      text: tp(
        'В мёртвой зоне. Уваливайся - лодка встала.',
        'No-go zone. Bear away, the boat has stopped.',
        'Strefa martwa. Zejdz od wiatru.',
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
      ),
      tone: 'danger',
    };
  }

  // -------- WARNING --------
  if (diag.mainStalled) {
    const tail = trimDelta > TRIM_RISING
      ? tp(' Уже лучше.', ' Recovering.', ' Poprawia sie.')
      : '';
    return {
      text: tp(
        'Грот перетянут - поток сорвался.' + tail,
        'Main overtrimmed - flow has detached.' + tail,
        'Grot przebrany - przeplyw oderwany.' + tail,
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
      ),
      tone: 'warn',
    };
  }
  if (heelAbs > 22 && ui.windSpeed >= 16 && ui.reefLevel === 0) {
    const heelRound = Math.round(heelAbs);
    const tail = heelDelta > HEEL_RISING
      ? tp(' и растёт', ' and rising', ' i rosnie')
      : heelDelta < HEEL_FALLING
      ? tp(' оседает', ' settling', ' opada')
      : '';
    return {
      text: tp(
        `Крен ${heelRound}°${tail}. Пора рифиться.`,
        `Heel ${heelRound} deg${tail}. Reef time.`,
        `Przechyl ${heelRound}°${tail}. Czas refic.`,
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
      ),
      tone: 'info',
    };
  }

  // -------- HEALTHY --------
  if (diag.slotHealth > 0.7 && absTwa < 130 && !diag.mainStalled && !diag.jibStalled) {
    const tail = trimDelta > TRIM_RISING
      ? tp(' Разгоняемся.', ' Picking up.', ' Rozpedza sie.')
      : trimDelta < TRIM_FALLING
      ? tp(' Но теряем.', ' But slipping.', ' Ale tracimy.')
      : '';
    return {
      text: tp(
        'Слот здоров - оба паруса тянут.' + tail,
        'Slot is healthy - both sails pulling.' + tail,
        'Slot zdrowy - oba zagle ciagna.' + tail,
      ),
      tone: 'good',
    };
  }
  if (state.boatSpeed >= 5 && heelAbs < 20 && !diag.mainStalled && !diag.jibStalled) {
    const tail = trimDelta > TRIM_RISING
      ? tp(' Держи так.', ' Hold it.', ' Trzymaj.')
      : '';
    return {
      text: tp(
        'Настройка близка к оптимуму.' + tail,
        'Trim is near optimal.' + tail,
        'Trym bliski optymalnego.' + tail,
      ),
      tone: 'good',
    };
  }

  return {
    text: tp(
      'Крути контролы и смотри на скорость и крен.',
      'Move the controls and watch speed and heel.',
      'Ruszaj slajdery, patrz na predkosc i przechyl.',
    ),
    tone: 'info',
  };
}
