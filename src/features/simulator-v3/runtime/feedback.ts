import { type PointOfSail } from '@/data/sailing-data';
import { type TickResult } from '@/lib/sailing-physics';
import { type FeedbackTone, type TpFn, type UiState } from '../ui/shared';

// ---------------------------------------------------------------------------
// Commentary picker - one line per tick. Priority order: danger > warn > info > good.
// ---------------------------------------------------------------------------

export function pickPrimaryFeedback(args: {
  ui: UiState;
  result: TickResult;
  pos: PointOfSail;
  absTwa: number;
  tp: TpFn;
}): { text: string; tone: FeedbackTone } {
  const { ui, result, absTwa, tp } = args;
  const { diag, state } = result;

  // DANGER band: heel over threshold with no reef in heavy air
  if (Math.abs(state.heel) > 28 && ui.windSpeed >= 16 && ui.reefLevel === 0) {
    return {
      text: tp(
        'Крен очень высокий. Возьми риф, иначе потеряешь контроль.',
        'Heel is critical. Take a reef before you lose control.',
        'Przechyl jest krytyczny. Wez refa.',
      ),
      tone: 'danger',
    };
  }
  if (absTwa < 30) {
    return {
      text: tp(
        'Ты в мёртвой зоне. Поверни дальше от ветра, лодка встала.',
        "You're in the no-go zone. Fall off from the wind - the boat has stopped.",
        'Jestes w strefie martwej. Zejdz od wiatru.',
      ),
      tone: 'danger',
    };
  }
  if (diag.mainStalled && Math.abs(state.heel) > 22) {
    return {
      text: tp(
        'Грот в срыве + большой крен. Ослабь грот и возьми риф.',
        'Main is stalled and heel is high. Ease the main and reef.',
        'Grot zerwany plus przechyl. Uwolnij grota i wez refa.',
      ),
      tone: 'danger',
    };
  }

  // WARN band
  if (diag.mainStalled) {
    return {
      text: tp(
        'Грот перетянут. На нём срыв потока, тяга падает.',
        'Main is overtrimmed. Flow has stalled and drive is dropping.',
        'Grot przebrany. Oderwanie przeplywu.',
      ),
      tone: 'warn',
    };
  }
  if (diag.jibStalled && ui.jibFurlPct > 20) {
    return {
      text: tp(
        'Стаксель перетянут. Он душит грот и сам теряет форму.',
        'Jib is overtrimmed. It chokes the main and loses shape.',
        'Fok zbyt mocno wybrany.',
      ),
      tone: 'warn',
    };
  }
  if (Math.abs(state.heel) > 22 && ui.windSpeed >= 16 && ui.reefLevel === 0) {
    return {
      text: tp(
        'Крен выше 22°. Пора брать первый риф.',
        'Heel above 22 deg. Time for the first reef.',
        'Przechyl powyzej 22. Wez pierwszy ref.',
      ),
      tone: 'warn',
    };
  }
  if (diag.mainAoA < 5 && diag.jibAoA < 5) {
    return {
      text: tp(
        'Паруса полощут. Угол атаки слишком мал - подтяни шкоты.',
        'Sails are luffing. Angle of attack too small - sheet in.',
        'Zagle lopoczaz. Wybierz szoty.',
      ),
      tone: 'warn',
    };
  }
  if (Math.abs(state.leeway) > 7) {
    return {
      text: tp(
        'Лодку сильно сносит вбок. Киль уже не держит.',
        'Boat is slipping hard sideways. The keel is saturated.',
        'Jacht silnie zsuwa sie bokiem.',
      ),
      tone: 'warn',
    };
  }

  // GOOD band
  if (diag.slotHealth > 0.7 && absTwa < 130 && !diag.mainStalled && !diag.jibStalled) {
    return {
      text: tp(
        'Слот здоров - оба паруса тянут вместе.',
        'Slot is healthy - both sails pulling together.',
        'Slot jest zdrowy.',
      ),
      tone: 'good',
    };
  }
  if (state.boatSpeed >= 5 && Math.abs(state.heel) < 20 && !diag.mainStalled && !diag.jibStalled) {
    return {
      text: tp(
        'Настройка близка к оптимальной.',
        'Trim is close to optimal.',
        'Ustawienie bliskie optymalnemu.',
      ),
      tone: 'good',
    };
  }

  return {
    text: tp(
      'Крути контролы и смотри, как меняются скорость и крен.',
      'Turn the controls and watch how speed and heel respond.',
      'Zmieniaj ustawienia i obserwuj.',
    ),
    tone: 'info',
  };
}
