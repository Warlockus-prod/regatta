/**
 * Rule-based coaching - used when the Claude API isn't available.
 * Analyses the race log directly with heuristics.
 * Returns the same shape as the AI coach, so the UI is interchangeable.
 *
 * i18n: accepts a `lang` parameter (any of the 7 site languages). All
 * user-facing strings are picked per-language. JSON field names (titleRu,
 * fixRu, nextGoalRu) are kept for client compatibility - values inside match
 * lang.
 */

import type { Lang } from './languages';
type CoachLang = Lang;

interface LogSample {
  t: number; x: number; y: number; heading: number; twa: number; speed: number; lap: number;
}

interface LogEvent {
  type: 'start' | 'tack' | 'mark-rounded' | 'finish' | 'no-go-entered';
  t: number;
  note?: string;
}

interface RaceLog {
  difficulty: string;
  courseInfo: { windDirection: number; windwardMark: { x: number; y: number }; startY: number };
  finishTime: number | null;
  position: number;
  totalBoats: number;
  samples: LogSample[];
  events: LogEvent[];
}

/**
 * Coaching response shape.
 *
 * The legacy `*Ru` field names are kept as REQUIRED for backward
 * compatibility - older replays and cached responses still use them. The
 * non-suffixed aliases (`title`, `explanation`, `fix`, `nextGoal`) are
 * NEW (2026-04-26) and OPTIONAL: every fresh response from /api/coach
 * fills BOTH sets of names with the same content, but anything stored
 * before the rename only has the `*Ru` versions.
 *
 * Consumers should prefer the non-suffixed name and fall back to `*Ru`,
 * via the `pickCoachField` helper below. This lets us rename the
 * confusing "RU" suffix without breaking a single downstream use.
 */
export interface Coaching {
  overall: string;
  score: number;
  mistakes: Array<{
    timeStart: number;
    timeEnd: number;
    severity: 'minor' | 'major';
    titleRu: string;
    explanationRu: string;
    fixRu: string;
    title?: string;
    explanation?: string;
    fix?: string;
  }>;
  strengths: string[];
  nextGoalRu: string;
  nextGoal?: string;
}

/** Read either the new (`title`) or legacy (`titleRu`) field. */
export function coachTitle(m: Coaching['mistakes'][number]): string {
  return m.title ?? m.titleRu;
}
export function coachExplanation(m: Coaching['mistakes'][number]): string {
  return m.explanation ?? m.explanationRu;
}
export function coachFix(m: Coaching['mistakes'][number]): string {
  return m.fix ?? m.fixRu;
}
export function coachNextGoal(c: Coaching): string {
  return c.nextGoal ?? c.nextGoalRu;
}

export function analyseRaceLocally(log: RaceLog, lang: CoachLang = 'ru'): Coaching {
  // Pick strategy: RU / EN / PL positional, ES / FR / DE / IT from the 4th
  // argument, so every site language gets its own rule-based coaching.
  const pick = (ru: string, en: string, pl: string, x: { es: string; fr: string; de: string; it: string }) => {
    if (lang === 'ru') return ru;
    if (lang === 'pl') return pl;
    if (lang === 'es' || lang === 'fr' || lang === 'de' || lang === 'it') return x[lang];
    return en;
  };
  // Decimal comma for every language except English.
  const dec = (n: number) => n.toFixed(1).replace('.', ',');

  const mistakes: Coaching['mistakes'] = [];
  const strengths: string[] = [];
  let score = 70;

  // ----- Count no-go entries (>=2 = problem) -----
  const noGoEntries = log.events.filter((e) => e.type === 'no-go-entered');
  if (noGoEntries.length >= 2) {
    const first = noGoEntries[0];
    mistakes.push({
      timeStart: first.t,
      timeEnd: first.t + 3,
      severity: noGoEntries.length >= 4 ? 'major' : 'minor',
      titleRu: pick(
        `Попадания в мёртвую зону (${noGoEntries.length}×)`,
        `No-go zone entries (${noGoEntries.length}x)`,
        `Wejścia w kąt martwy (${noGoEntries.length}×)`,
        {
          es: `Entradas en la zona muerta (${noGoEntries.length}×)`,
          fr: `Entrées dans la zone morte (${noGoEntries.length}×)`,
          de: `Im toten Winkel (${noGoEntries.length}×)`,
          it: `Ingressi nell'angolo morto (${noGoEntries.length}×)`,
        },
      ),
      explanationRu: pick(
        'Нос яхты заходил в сектор ±30° к ветру несколько раз. В этой зоне паруса заполаскивают и яхта теряет скорость.',
        'The bow swung into the ±30° sector either side of the wind several times. In this zone the sails luff and the boat loses speed.',
        'Dziób kilka razy wchodził w sektor ±30° od wiatru. W tej strefie żagle łopoczą, a jacht traci prędkość.',
        {
          es: 'La proa entró varias veces en el sector de ±30° respecto al viento. En esa zona las velas flamean y el barco pierde velocidad.',
          fr: 'L\'étrave est entrée plusieurs fois dans le secteur de ±30° face au vent. Dans cette zone, les voiles faseyent et le bateau perd de la vitesse.',
          de: 'Der Bug ist mehrmals in den Sektor ±30° zum Wind geraten. Dort killen die Segel und das Boot verliert Fahrt.',
          it: 'La prua è entrata più volte nel settore di ±30° dal vento. In quella zona le vele fileggiano e la barca perde velocità.',
        },
      ),
      fixRu: pick(
        'Держи угол к ветру минимум 40° при лавировке. Если попал в левентик - сразу увалить на ~50°, чтобы паруса снова потянули.',
        'Keep at least 40° to the wind when beating upwind. If you end up head to wind, bear away ~50° right away so the sails fill again.',
        'Na halsówce trzymaj co najmniej 40° do wiatru. Jeśli wpadniesz w łopot, od razu odpadnij o ~50°, żeby żagle znów zaczęły pracować.',
        {
          es: 'En ceñida mantén al menos 40° respecto al viento. Si te quedas proa al viento, arriba enseguida unos 50° para que las velas vuelvan a portar.',
          fr: 'Au louvoyage, garde au moins 40° par rapport au vent. Si tu te retrouves vent debout, abats tout de suite d\'environ 50° pour que les voiles portent à nouveau.',
          de: 'Halte beim Kreuzen mindestens 40° zum Wind. Stehst du im Wind, fall sofort etwa 50° ab, damit die Segel wieder ziehen.',
          it: 'Di bolina tieni almeno 40° dal vento. Se finisci prua al vento, poggia subito di circa 50° perché le vele tornino a portare.',
        },
      ),
    });
    score -= Math.min(20, noGoEntries.length * 4);
  } else if (noGoEntries.length === 0 && log.samples.length > 20) {
    strengths.push(pick(
      'Ни разу не попал в мёртвую зону',
      'Never entered the no-go zone',
      'Ani jednego wejścia w kąt martwy',
      {
        es: 'Ni una sola entrada en la zona muerta',
        fr: 'Aucune entrée dans la zone morte',
        de: 'Kein einziges Mal im toten Winkel',
        it: 'Nessun ingresso nell\'angolo morto',
      },
    ));
  }

  // ----- Count tacks -----
  const tackCount = log.events.filter((e) => e.type === 'tack').length;
  if (tackCount > 10) {
    mistakes.push({
      timeStart: 0,
      timeEnd: log.finishTime ?? 120,
      severity: 'minor',
      titleRu: pick(
        `Слишком много поворотов (${tackCount})`,
        `Too many tacks (${tackCount})`,
        `Za dużo zwrotów (${tackCount})`,
        {
          es: `Demasiadas viradas (${tackCount})`,
          fr: `Trop de virements (${tackCount})`,
          de: `Zu viele Wenden (${tackCount})`,
          it: `Troppe virate (${tackCount})`,
        },
      ),
      explanationRu: pick(
        'Каждый поворот оверштаг теряет скорость и время. На стандартной трассе достаточно 2-4 галсов до знака.',
        'Every tack costs speed and time. On a standard course 2-4 tacks to the mark is plenty.',
        'Każdy zwrot przez sztag kosztuje prędkość i czas. Na standardowej trasie do znaku wystarczą 2-4 halsy.',
        {
          es: 'Cada virada por avante cuesta velocidad y tiempo. En un recorrido estándar bastan 2-4 bordos hasta la baliza.',
          fr: 'Chaque virement de bord coûte de la vitesse et du temps. Sur un parcours standard, 2-4 bords suffisent jusqu\'à la bouée.',
          de: 'Jede Wende kostet Fahrt und Zeit. Auf einer Standardbahn reichen 2-4 Schläge bis zur Bahnmarke.',
          it: 'Ogni virata costa velocità e tempo. Su un percorso standard bastano 2-4 bordi fino alla boa.',
        },
      ),
      fixRu: pick(
        'Выбирай длинные галсы, переходи на другой галс только когда лейлайн ясно указывает смену.',
        'Sail long legs and tack only when the layline clearly calls for it.',
        'Wybieraj długie halsy i zmieniaj hals dopiero wtedy, gdy layline wyraźnie na to wskazuje.',
        {
          es: 'Haz bordos largos y vira solo cuando la layline lo pida claramente.',
          fr: 'Tire de longs bords et ne vire que lorsque la layline l\'impose clairement.',
          de: 'Segle lange Schläge und wende erst, wenn die Layline es klar verlangt.',
          it: 'Fai bordi lunghi e vira solo quando la layline lo richiede chiaramente.',
        },
      ),
    });
    score -= 8;
  } else if (tackCount <= 4 && log.finishTime) {
    strengths.push(pick(
      `Экономная лавировка: поворотов всего ${tackCount}`,
      `Efficient beat: only ${tackCount} tacks`,
      `Oszczędne halsowanie (zwroty: ${tackCount})`,
      {
        es: `Ceñida eficiente (viradas: ${tackCount})`,
        fr: `Louvoyage économe (virements : ${tackCount})`,
        de: `Sparsames Kreuzen (Wenden: ${tackCount})`,
        it: `Bolina efficiente (virate: ${tackCount})`,
      },
    ));
  }

  // ----- Time in no-go from samples -----
  const noGoSamples = log.samples.filter((s) => Math.abs(s.twa) < 30 && s.speed < 2);
  const noGoFraction = log.samples.length ? noGoSamples.length / log.samples.length : 0;
  if (noGoFraction > 0.15) {
    mistakes.push({
      timeStart: 0,
      timeEnd: log.finishTime ?? 120,
      severity: 'major',
      titleRu: pick(
        'Много времени в мёртвой зоне',
        'Too much time in the no-go zone',
        'Dużo czasu w kącie martwym',
        {
          es: 'Mucho tiempo en la zona muerta',
          fr: 'Trop de temps dans la zone morte',
          de: 'Zu lange im toten Winkel',
          it: 'Troppo tempo nell\'angolo morto',
        },
      ),
      explanationRu: pick(
        `Около ${Math.round(noGoFraction * 100)}% гонки скорость была ниже 2 узлов с углом к ветру меньше 30°. Это прямые потери времени.`,
        `For about ${Math.round(noGoFraction * 100)}% of the race you were below 2 knots at under 30° to the wind. That is pure time lost.`,
        `Przez około ${Math.round(noGoFraction * 100)}% wyścigu prędkość była poniżej 2 węzłów przy kącie do wiatru poniżej 30°. To czysta strata czasu.`,
        {
          es: `Durante cerca del ${Math.round(noGoFraction * 100)}% de la regata fuiste a menos de 2 nudos y a menos de 30° del viento. Es tiempo perdido sin más.`,
          fr: `Pendant environ ${Math.round(noGoFraction * 100)} % de la course, tu étais sous 2 nœuds à moins de 30° du vent. C'est du temps perdu, tout simplement.`,
          de: `Etwa ${Math.round(noGoFraction * 100)} % des Rennens warst du unter 2 Knoten bei weniger als 30° zum Wind. Das ist reiner Zeitverlust.`,
          it: `Per circa il ${Math.round(noGoFraction * 100)}% della regata la velocità è rimasta sotto i 2 nodi con meno di 30° dal vento. È tempo perso e basta.`,
        },
      ),
      fixRu: pick(
        'Следи за углом к ветру на HUD. Как только TWA опускается ниже 35° - сразу увалить.',
        'Watch the wind angle on the HUD. As soon as TWA drops below 35°, bear away.',
        'Pilnuj kąta do wiatru na HUD. Gdy tylko TWA spadnie poniżej 35°, od razu odpadnij.',
        {
          es: 'Vigila el ángulo al viento en el HUD. En cuanto el TWA baje de 35°, arriba enseguida.',
          fr: 'Surveille l\'angle au vent sur le HUD. Dès que le TWA passe sous 35°, abats tout de suite.',
          de: 'Behalte den Windwinkel im HUD im Blick. Sobald der TWA unter 35° fällt, sofort abfallen.',
          it: 'Tieni d\'occhio l\'angolo al vento sull\'HUD. Appena il TWA scende sotto i 35°, poggia subito.',
        },
      ),
    });
    score -= 15;
  }

  // ----- Close-hauled speed -----
  const closeHauledSamples = log.samples.filter((s) => Math.abs(s.twa) >= 35 && Math.abs(s.twa) <= 55);
  if (closeHauledSamples.length > 5) {
    const avgSpeed = closeHauledSamples.reduce((sum, s) => sum + s.speed, 0) / closeHauledSamples.length;
    if (avgSpeed >= 4.5) {
      strengths.push(pick(
        `Хорошая скорость в бейдевинде: в среднем ${dec(avgSpeed)} уз`,
        `Good speed close-hauled: ${avgSpeed.toFixed(1)} kts average`,
        `Dobra prędkość na bajdewindzie: średnio ${dec(avgSpeed)} kn`,
        {
          es: `Buena velocidad en ceñida: ${dec(avgSpeed)} kn de media`,
          fr: `Bonne vitesse au près : ${dec(avgSpeed)} kn de moyenne`,
          de: `Gute Fahrt hoch am Wind: im Schnitt ${dec(avgSpeed)} kn`,
          it: `Buona velocità di bolina: ${dec(avgSpeed)} kn di media`,
        },
      ));
    } else if (avgSpeed < 3) {
      mistakes.push({
        timeStart: 0,
        timeEnd: log.finishTime ?? 120,
        severity: 'minor',
        titleRu: pick(
          'Медленно в бейдевинде',
          'Slow close-hauled',
          'Wolno na bajdewindzie',
          {
            es: 'Lento en ceñida',
            fr: 'Lent au près',
            de: 'Langsam hoch am Wind',
            it: 'Lento di bolina',
          },
        ),
        explanationRu: pick(
          `Средняя скорость в бейдевинде всего ${dec(avgSpeed)} уз. Вероятно, идёшь слишком близко к ветру - теряешь в скорости больше, чем выигрываешь в угле.`,
          `Average close-hauled speed is only ${avgSpeed.toFixed(1)} kts. Probably pointing too high - losing more in speed than you gain in angle.`,
          `Średnia prędkość na bajdewindzie to tylko ${dec(avgSpeed)} kn. Pewnie płyniesz za ostro - tracisz więcej na prędkości, niż zyskujesz na kącie.`,
          {
            es: `La velocidad media en ceñida es de solo ${dec(avgSpeed)} kn. Seguramente vas demasiado orzado - pierdes más en velocidad de lo que ganas en ángulo.`,
            fr: `Ta vitesse moyenne au près n'est que de ${dec(avgSpeed)} kn. Tu serres sans doute trop le vent - tu perds plus en vitesse que tu ne gagnes en cap.`,
            de: `Deine Durchschnittsfahrt hoch am Wind liegt bei nur ${dec(avgSpeed)} kn. Wahrscheinlich kneifst du zu hoch - du verlierst mehr Fahrt, als du an Höhe gewinnst.`,
            it: `La velocità media di bolina è solo ${dec(avgSpeed)} kn. Probabilmente stringi troppo il vento - perdi più in velocità di quanto guadagni in angolo.`,
          },
        ),
        fixRu: pick(
          'Попробуй увалить на 5-10° от текущего курса. Скорость в бейдевинде важнее узкого угла.',
          'Try bearing away 5-10° from your current heading. Close-hauled, speed matters more than a tight angle.',
          'Spróbuj odpaść o 5-10° od obecnego kursu. Na bajdewindzie prędkość jest ważniejsza niż ostry kąt.',
          {
            es: 'Prueba a arribar 5-10° respecto al rumbo actual. En ceñida, la velocidad importa más que un ángulo cerrado.',
            fr: 'Essaie d\'abattre de 5-10° par rapport à ton cap actuel. Au près, la vitesse compte plus qu\'un angle serré.',
            de: 'Versuch, 5-10° vom aktuellen Kurs abzufallen. Hoch am Wind ist Fahrt wichtiger als ein enger Winkel.',
            it: 'Prova a poggiare di 5-10° rispetto alla rotta attuale. Di bolina la velocità conta più di un angolo stretto.',
          },
        ),
      });
      score -= 5;
    }
  }

  // ----- Position bonus -----
  const places = log.totalBoats || 3;
  if (log.position === 1) score += 15;
  else if (log.position === places) score -= 10;
  score = Math.max(0, Math.min(100, score));

  // ----- Strengths baseline -----
  if (strengths.length === 0 && log.finishTime) {
    strengths.push(pick(
      'Гонка пройдена до конца',
      'Race completed',
      'Wyścig ukończony',
      {
        es: 'Regata completada',
        fr: 'Course bouclée',
        de: 'Rennen beendet',
        it: 'Regata completata',
      },
    ));
  }

  const topMistakes = mistakes.slice(0, 3);

  // ----- Overall + next goal -----
  let overall: string;
  let nextGoal: string;
  if (!log.finishTime) {
    overall = pick(
      'Не удалось финишировать - вероятно, потерял курс или слишком много времени провёл в мёртвой зоне.',
      'Did not finish - you probably lost the course or spent too much time in the no-go zone.',
      'Nie udało się dopłynąć do mety - pewnie zgubiłeś trasę albo spędziłeś za dużo czasu w kącie martwym.',
      {
        es: 'No terminaste la regata - seguramente te desviaste del recorrido o pasaste demasiado tiempo en la zona muerta.',
        fr: 'Pas d\'arrivée - tu as sans doute perdu le parcours ou passé trop de temps dans la zone morte.',
        de: 'Nicht ins Ziel gekommen - wahrscheinlich hast du die Bahn verloren oder zu lange im toten Winkel gesteckt.',
        it: 'Regata non conclusa - probabilmente hai perso il percorso o hai passato troppo tempo nell\'angolo morto.',
      },
    );
    nextGoal = pick(
      'Пройти трассу полностью за любое время - цель номер один.',
      'Finish the course, whatever the time - that is goal number one.',
      'Ukończyć trasę w dowolnym czasie - to cel numer jeden.',
      {
        es: 'Completar el recorrido, con el tiempo que sea - ese es el objetivo número uno.',
        fr: 'Boucler le parcours, peu importe le temps - c\'est l\'objectif numéro un.',
        de: 'Die Bahn komplett segeln, egal in welcher Zeit - das ist Ziel Nummer eins.',
        it: 'Completare il percorso, in qualsiasi tempo - è l\'obiettivo numero uno.',
      },
    );
  } else if (log.position === 1) {
    overall = pick(
      `Победа за ${formatTime(log.finishTime)}! Отличный результат.`,
      `Won in ${formatTime(log.finishTime)}! Great result.`,
      `Zwycięstwo z czasem ${formatTime(log.finishTime)}! Świetny wynik.`,
      {
        es: `¡Victoria en ${formatTime(log.finishTime)}! Gran resultado.`,
        fr: `Victoire en ${formatTime(log.finishTime)} ! Excellent résultat.`,
        de: `Sieg in ${formatTime(log.finishTime)}! Starkes Ergebnis.`,
        it: `Vittoria in ${formatTime(log.finishTime)}! Ottimo risultato.`,
      },
    );
    nextGoal = pick(
      'Попробуй сложный уровень или улучши время на той же сложности.',
      'Try hard mode or beat your time on the same difficulty.',
      'Spróbuj poziomu trudnego albo popraw czas na tym samym poziomie.',
      {
        es: 'Prueba el nivel difícil o mejora tu tiempo en la misma dificultad.',
        fr: 'Essaie le niveau difficile ou bats ton temps au même niveau.',
        de: 'Probier die schwere Stufe oder verbessere deine Zeit auf derselben Stufe.',
        it: 'Prova il livello difficile o migliora il tuo tempo allo stesso livello.',
      },
    );
  } else if (log.position <= Math.ceil(places / 2)) {
    overall = pick(
      `Финиш на ${log.position} месте из ${places} за ${formatTime(log.finishTime)}. Крепкий результат, есть куда расти.`,
      `Finished ${log.position} of ${places} in ${formatTime(log.finishTime)}. Solid result, room to grow.`,
      `Meta na ${log.position}. miejscu z ${places}, czas ${formatTime(log.finishTime)}. Solidny wynik, ale jest jeszcze pole do poprawy.`,
      {
        es: `Terminaste en el puesto ${log.position} de ${places} en ${formatTime(log.finishTime)}. Buen resultado, con margen de mejora.`,
        fr: `Arrivée à la ${log.position}e place sur ${places} en ${formatTime(log.finishTime)}. Résultat solide, tu peux encore progresser.`,
        de: `Platz ${log.position} von ${places} in ${formatTime(log.finishTime)}. Solides Ergebnis, da ist noch Luft nach oben.`,
        it: `Arrivo al ${log.position}º posto su ${places} in ${formatTime(log.finishTime)}. Risultato solido, c'è margine per crescere.`,
      },
    );
    nextGoal = pick(
      'Сократи количество поворотов и время в мёртвой зоне - это даст пару секунд.',
      'Cut down on tacks and time in the no-go zone - that will save a couple of seconds.',
      'Ogranicz liczbę zwrotów i czas w kącie martwym - to da kilka sekund.',
      {
        es: 'Reduce las viradas y el tiempo en la zona muerta - así ganarás unos segundos.',
        fr: 'Réduis le nombre de virements et le temps dans la zone morte - tu gagneras quelques secondes.',
        de: 'Weniger Wenden und weniger Zeit im toten Winkel - das bringt ein paar Sekunden.',
        it: 'Riduci le virate e il tempo nell\'angolo morto - guadagnerai qualche secondo.',
      },
    );
  } else {
    overall = pick(
      `Финиш на ${log.position} из ${places} за ${formatTime(log.finishTime)}. Есть над чем поработать.`,
      `Finished ${log.position} of ${places} in ${formatTime(log.finishTime)}. Room for improvement.`,
      `Meta na ${log.position}. miejscu z ${places}, czas ${formatTime(log.finishTime)}. Jest nad czym pracować.`,
      {
        es: `Terminaste en el puesto ${log.position} de ${places} en ${formatTime(log.finishTime)}. Hay cosas que mejorar.`,
        fr: `Arrivée à la ${log.position}e place sur ${places} en ${formatTime(log.finishTime)}. Il y a du travail.`,
        de: `Platz ${log.position} von ${places} in ${formatTime(log.finishTime)}. Da gibt es noch einiges zu tun.`,
        it: `Arrivo al ${log.position}º posto su ${places} in ${formatTime(log.finishTime)}. C'è da lavorare.`,
      },
    );
    nextGoal = pick(
      'Сконцентрируйся на контроле угла к ветру - большинство потерь времени оттуда.',
      'Focus on wind-angle control - most time losses come from there.',
      'Skup się na kontroli kąta do wiatru - stąd bierze się większość strat czasu.',
      {
        es: 'Céntrate en controlar el ángulo al viento - de ahí viene la mayor parte del tiempo perdido.',
        fr: 'Concentre-toi sur l\'angle au vent - c\'est là que tu perds le plus de temps.',
        de: 'Konzentrier dich auf den Winkel zum Wind - dort verlierst du die meiste Zeit.',
        it: 'Concentrati sul controllo dell\'angolo al vento - è lì che perdi più tempo.',
      },
    );
  }

  return mirrorCoachKeys({
    overall,
    score,
    mistakes: topMistakes,
    strengths,
    nextGoalRu: nextGoal,
  });
}

/**
 * Copy each legacy `*Ru` field into its non-suffixed alias so a freshly
 * produced response satisfies BOTH the old and new readers. Cheap, runs
 * on every analyse call. The `*Ru` fields stay required for backward
 * compat; the aliases are populated on first emit and persist into any
 * future cache.
 */
export function mirrorCoachKeys(c: Coaching): Coaching {
  return {
    ...c,
    nextGoal: c.nextGoal ?? c.nextGoalRu,
    mistakes: c.mistakes.map((m) => ({
      ...m,
      title: m.title ?? m.titleRu,
      explanation: m.explanation ?? m.explanationRu,
      fix: m.fix ?? m.fixRu,
    })),
  };
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
