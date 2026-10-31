'use client';

// Briefing screen of the solo race (/game): explains the course and three
// rules before the countdown. GameClient keeps the phase root (scroll ref,
// data-race-phase, viewport height); this renders what is inside it.
// M1-1: the mode is chosen once, in the lobby (or the app's Race hub), so the
// briefing only shows it. It opens by itself the first time on a course and
// from the lobby's "i" button.

import { useI18n } from '@/lib/i18n';
import { formatRecordTime, type BestRecord } from '@/lib/best-times';
import { PHYSICAL_RACE_PROFILES, type PhysicalRaceProfile } from "@/lib/race-context";
import { physicalCourseDefinition } from "@/lib/race-courses";
import { useRaceCopy } from "./race-copy";
import { DIFFICULTY_CONFIG, type Difficulty } from './config';
import { TrophyIcon } from "@/features/race-hud/RaceIcons";

export function RaceBriefing({
  onBack, bestRecord, difficulty, windStrength, mode, trialProfile, onChooseTrialCourse, onStart, reopenNote = true,
}: {
  onBack: () => void;
  bestRecord: BestRecord | null;
  difficulty: Difficulty;
  windStrength: 'light' | 'medium' | 'heavy';
  mode: "simple" | "pro";
  trialProfile: PhysicalRaceProfile | null;
  onChooseTrialCourse: (profile: PhysicalRaceProfile) => void;
  onStart: () => void;
  /** Says how to reopen the briefing; off where no lobby "i" button is on the way. */
  reopenNote?: boolean;
}) {
  const { tp, tl } = useI18n();
  const raceCopy = useRaceCopy();
  const yourBest = tp('Твой рекорд', 'Your best', 'Twój rekord',
    { es: 'Tu récord', fr: 'Ton record', de: 'Dein Rekord', it: 'Il tuo record' });
  return (
    <>
        <div data-race-scroll className="min-h-0 flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="min-h-11 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center gap-1"
          >
            ← {tp('Назад к выбору', 'Back to menu', 'Wróć do wyboru', { es: 'Volver al menú', fr: 'Retour au menu', de: 'Zurück zum Menü', it: 'Torna al menu' })}
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Personal best for this difficulty + wind bucket. Hidden if
                the user hasn't finished a race in this combo yet. */}
            {bestRecord && (
              <div
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-mono"
                data-testid="briefing-record"
                style={{
                  background: 'rgba(255, 170, 0, 0.12)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(255, 170, 0, 0.3)',
                }}
                title={yourBest}
              >
                <TrophyIcon className="shrink-0" />
                <span className="sr-only">{yourBest}: </span>
                <span>{formatRecordTime(bestRecord.timeSec)}</span>
              </div>
            )}
            <div data-testid="briefing-mode" className="text-xs px-2 py-1 rounded font-semibold" style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}>{mode === "pro" ? raceCopy.pro : raceCopy.simple}</div>
            <div className="text-xs px-2 py-1 rounded" style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}>
              {tp(DIFFICULTY_CONFIG[difficulty].label, DIFFICULTY_CONFIG[difficulty].labelEn, DIFFICULTY_CONFIG[difficulty].labelPl, { es: DIFFICULTY_CONFIG[difficulty].labelEs, fr: DIFFICULTY_CONFIG[difficulty].labelFr, de: DIFFICULTY_CONFIG[difficulty].labelDe, it: DIFFICULTY_CONFIG[difficulty].labelIt })} · {windStrength === 'light'
                ? tp('слабый ветер', 'light wind', 'słaby wiatr', { es: 'viento flojo', fr: 'vent faible', de: 'leichter Wind', it: 'vento leggero' })
                : windStrength === 'heavy'
                  ? tp('сильный ветер', 'heavy wind', 'silny wiatr', { es: 'viento fuerte', fr: 'vent fort', de: 'starker Wind', it: 'vento forte' })
                  : tp('средний ветер', 'medium wind', 'średni wiatr', { es: 'viento medio', fr: 'vent moyen', de: 'mittlerer Wind', it: 'vento medio' })}
            </div>
          </div>
        </div>

        <h1 tabIndex={-1} className="text-3xl sm:text-4xl font-semibold mb-1">
          {tp('Брифинг', 'Briefing', 'Odprawa', { es: 'Briefing', fr: 'Briefing', de: 'Briefing', it: 'Briefing' })}
        </h1>
        <p className="mb-5 text-base leading-6 text-[var(--text-secondary)]">{mode === "pro" ? raceCopy.proNote : raceCopy.simpleNote}</p>
        {trialProfile ? (
          <div role="radiogroup" data-testid="physical-trial-course" className="mb-3 flex gap-2"
            aria-label={tl({ ru: "Длина лавировки", en: "Beat length", pl: "Długość halsówki", es: "Longitud de la ceñida", fr: "Longueur du louvoyage", de: "Länge der Kreuz", it: "Lunghezza della bolina" })}>
            {PHYSICAL_RACE_PROFILES.map(profile => <button key={profile} type="button" role="radio" aria-checked={trialProfile === profile}
              onClick={() => onChooseTrialCourse(profile)}
              className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold ${trialProfile === profile
                ? "border-[var(--accent-cyan)] text-[var(--accent-cyan)]" : "border-[var(--border-subtle)] text-[var(--text-secondary)]"}`}>
              {tl({ ru: "%d м", en: "%d m", pl: "%d m", es: "%d m", fr: "%d m", de: "%d m", it: "%d m" }).replace("%d", String(physicalCourseDefinition(profile).legMetres))}
            </button>)}
          </div>
        ) : null}
        <PhysicalTrialNote profile={trialProfile} />

        {/* One card: the course with its four steps, and three rules. */}
        <div className="card p-4 sm:p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">{tp('ТРАССА', 'COURSE', 'TRASA', { es: 'RECORRIDO', fr: 'PARCOURS', de: 'BAHN', it: 'PERCORSO' })}</div>
            <CoursePreview />
            <ol className="text-sm text-[var(--text-secondary)] mt-4 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>{tp('Старт от оранжевой линии внизу.', 'Start from the orange line at the bottom.', 'Start z pomarańczowej linii na dole.', { es: 'La salida es desde la línea naranja de abajo.', fr:'Départ depuis la ligne orange en bas.', de: 'Start an der orangen Linie unten.', it: 'Partenza dalla linea arancione in basso.' })}</li>
              <li>{tp('Идёшь', 'Work', 'Płyniesz', { es: 'Sube', fr: 'Remonte', de: 'Segle', it: 'Risali' })} <span className="text-[var(--text-primary)] font-semibold">{tp('галсами', 'upwind in tacks', 'halsami', { es: 'dando bordos', fr: 'en louvoyant', de: 'in Kreuzschlägen', it: 'bordeggiando' })}</span> {tp('к верхнему знаку - прямо против ветра нельзя.', 'to the windward mark - you can\'t sail straight into the wind.', 'do znaku nawietrznego - prosto pod wiatr się nie da.', { es: 'hasta la baliza de barlovento - directo contra el viento no se puede.', fr: 'jusqu\'à la bouée au vent - impossible d\'aller droit contre le vent.', de: 'zur Luvtonne - direkt gegen den Wind geht es nicht.', it: 'fino alla boa di bolina - dritti controvento non si può.' })}</li>
              <li>{tp('Обогни верхний знак, оставив его по левому борту.', 'Round the windward mark, leaving it to port.', 'Okrąż znak nawietrzny, zostawiając go po lewej burcie.', { es: 'Rodea la baliza de barlovento dejándola a babor.', fr: 'Contourne la bouée au vent en la laissant à bâbord.', de: 'Runde die Luvtonne und lasse sie an Backbord.', it: 'Gira la boa di bolina lasciandola a sinistra.' })}</li>
              <li>{tp('Возвращаешься полным курсом и пересекаешь финиш сверху вниз.', 'Run back downwind and cross the finish top to bottom.', 'Wracasz kursem pełnym i przecinasz linię mety z góry na dół.', { es: 'Vuelve a favor del viento y cruza la línea de llegada de arriba abajo.', fr: 'Redescends au portant et coupe la ligne d\'arrivée de haut en bas.', de: 'Segle raumschots zurück und fahr von oben nach unten über die Ziellinie.', it: 'Torna con le andature portanti e taglia il traguardo dall\'alto verso il basso.' })}</li>
            </ol>
          </div>
          <ul className="space-y-4 self-center">
            {[
              { icon: 'nogo', text: tl({
                ru: '±30° к ветру - мёртвая зона: паруса не тянут. Если лодка встала, уваливайся примерно на 50°.',
                en: 'Within 30° of the wind is the no-go zone: the sails do not pull. If you stop, bear away about 50°.',
                pl: '±30° od wiatru to kąt martwy: żagle nie pracują. Jeśli staniesz, odpadnij o jakieś 50°.',
                es: 'A ±30° del viento está la zona muerta: las velas no tiran. Si te paras, arriba unos 50°.',
                fr: "À ±30° du vent, c'est la zone morte : les voiles ne portent pas. Si tu t'arrêtes, abats d'environ 50°.",
                de: '±30° zum Wind ist der tote Winkel: Die Segel ziehen nicht. Wenn du stehst, fall etwa 50° ab.',
                it: "A ±30° dal vento c'è l'angolo morto: le vele non portano. Se ti fermi, poggia di circa 50°.",
              }) },
              { icon: 'tack', text: tl({
                ru: 'Длинные галсы: каждый поворот стоит скорости, HUD покажет сколько.',
                en: 'Long tacks: every turn costs speed, and the HUD shows how much.',
                pl: 'Długie halsy: każdy zwrot kosztuje prędkość, a HUD pokaże ile.',
                es: 'Bordos largos: cada virada cuesta velocidad y el HUD te dice cuánta.',
                fr: 'De longs bords : chaque virement coûte de la vitesse, et le HUD te dit combien.',
                de: 'Lange Schläge: Jede Wende kostet Fahrt, das HUD zeigt dir, wie viel.',
                it: "Bordi lunghi: ogni virata costa velocità e l'HUD ti dice quanta.",
              }) },
              { icon: 'steer', text: tl({
                ru: 'Рули штурвалом или ползунком. Стрелки ← → тоже поворачивают лодку.',
                en: 'Steer with the wheel or slider. The ← → keys also turn the boat.',
                pl: 'Steruj kołem lub suwakiem. Strzałki ← → również skręcają łódź.',
                es: 'Gobierna con la rueda o el deslizador. Las teclas ← → también giran el barco.',
                fr: 'Barre avec la roue ou le curseur. Les touches ← → font aussi tourner le bateau.',
                de: 'Steuere mit Rad oder Schieberegler. Auch ← → drehen das Boot.',
                it: 'Governa con la ruota o il cursore. Anche i tasti ← → fanno girare la barca.',
              }) },
              ...(mode === "pro" ? [{ icon: 'sheets', text: tl({
                ru: 'В Pro шкоты на тебе: Q/A гика-шкот, W/S стаксель-шкот.',
                en: 'In Pro you trim the sheets: Q/A mainsheet, W/S jib sheet.',
                pl: 'W Pro obsługujesz szoty: Q/A szot grota, W/S szot foka.',
                es: 'En Pro trimas tú las escotas: Q/A escota de mayor, W/S escota de foque.',
                fr: 'En Pro, tu règles les écoutes : Q/A écoute de grand-voile, W/S écoute de foc.',
                de: 'In Pro bedienst du die Schoten: Q/A Großschot, W/S Fockschot.',
                it: 'In Pro regoli tu le scotte: Q/A scotta della randa, W/S scotta del fiocco.',
              }) }] : []),
            ].map((rule) => (
              <li key={rule.icon} className="flex items-start gap-3">
                <BriefingIcon kind={rule.icon as 'nogo' | 'tack' | 'steer' | 'sheets'} />
                <span className="text-sm leading-relaxed text-[var(--text-secondary)]">{rule.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {reopenNote && <p className="text-sm leading-6 text-[var(--text-muted)]" data-testid="briefing-once-note">
          {tl({
            ru: 'Перед следующими стартами брифинг не появится. Открыть его снова можно кнопкой «i» рядом со стартом.',
            en: 'The briefing will not appear before your next starts. Open it again with the "i" button beside Start.',
            pl: 'Przed kolejnymi startami odprawa się nie pojawi. Otworzysz ją ponownie przyciskiem "i" obok startu.',
            es: 'El briefing no aparecerá antes de las próximas salidas. Vuelve a abrirlo con el botón "i" junto al botón Empezar.',
            fr: 'Le briefing ne s\'affichera plus avant les prochains départs. Rouvre-le avec le bouton "i" à côté du départ.',
            de: 'Vor den nächsten Starts erscheint das Briefing nicht mehr. Öffne es wieder mit der Taste "i" neben dem Start.',
            it: 'Il briefing non comparirà prima delle prossime partenze. Riaprilo con il pulsante "i" accanto al pulsante Inizia.',
          })}
        </p>}
        </div>
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto">
        <button
          onClick={onStart}
          className="w-full min-h-[52px] py-3 rounded-xl font-semibold text-lg transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
          style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink)' }}
        >
          {tp('Готов - старт через 3·2·1', 'Ready - starting in 3·2·1', 'Gotowy - start za 3·2·1', { es: 'Listo - salida en 3·2·1', fr: 'Prêt - départ dans 3·2·1', de: 'Bereit - Start in 3·2·1', it: 'Pronto - partenza tra 3·2·1' })}
        </button>
        </div></div>
    </>
  );
}

/** The opt-in physical trial's note (ADR-0014): shown on the briefing and the result. */
export function PhysicalTrialNote({ profile }: { profile: PhysicalRaceProfile | null }) {
  const { tl } = useI18n();
  if (!profile) return null;
  return (
    <p className="card mb-5 p-3 text-sm text-[var(--text-secondary)]" role="note" data-testid="physical-trial-note">
      {tl({
        ru: `Пробная гонка в метрах: лавировка ${physicalCourseDefinition(profile).legMetres} м, твоя лодка ведёт себя как в «Тренажёре трима». Результат, рекорд и запись гонки не сохраняются.`,
        en: `Trial race in real metres: a ${physicalCourseDefinition(profile).legMetres} m beat, your boat handles as in the Sail trim trainer. The result, best time and race recording are not saved.`,
        pl: `Wyścig próbny w metrach: halsówka ${physicalCourseDefinition(profile).legMetres} m, twój jacht prowadzi się jak w Trenażerze trymu. Wynik, rekord i nagranie wyścigu nie są zapisywane.`,
        es: `Regata de prueba en metros reales: ceñida de ${physicalCourseDefinition(profile).legMetres} m, tu barco se comporta como en el Simulador de trimado. El resultado, el récord y la grabación no se guardan.`,
        fr: `Course d'essai en mètres réels : louvoyage de ${physicalCourseDefinition(profile).legMetres} m, ton bateau se comporte comme dans Réglage des voiles. Le résultat, le record et l'enregistrement ne sont pas sauvegardés.`,
        de: `Probewettfahrt in echten Metern: ${physicalCourseDefinition(profile).legMetres} m Kreuz, dein Boot verhält sich wie im Segeltrimm-Trainer. Ergebnis, Bestzeit und Aufzeichnung werden nicht gespeichert.`,
        it: `Regata di prova in metri reali: bolina di ${physicalCourseDefinition(profile).legMetres} m, la tua barca si comporta come in Regolazione delle vele. Risultato, record e registrazione non vengono salvati.`,
      })}
    </p>
  );
}

function BriefingIcon({ kind }: { kind: 'nogo' | 'tack' | 'steer' | 'sheets' }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, className: 'shrink-0 mt-0.5 text-[var(--text-secondary)]' };
  if (kind === 'nogo') return (
    <svg {...common}><path d="M12 13 L7 4 M12 13 L17 4" /><path d="M12 13 v7" /><path d="M9.5 18.5 h5" /><path d="M12 1.5 v3" /></svg>
  );
  if (kind === 'sheets') return (
    <svg {...common}><path d="M6 20 L12 3 L18 20" /><path d="M12 3 v17" /><path d="M4 20 h16" /></svg>
  );
  if (kind === 'tack') return (
    <svg {...common}><path d="M8 21 L15 14 L9 8 L14 3" /><path d="M11.5 3 H14 V5.5" /></svg>
  );
  return (
    <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" /><path d="M12 4v6M12 14v6M4 12h6M14 12h6" /></svg>
  );
}

// ============================================================================
// Small SVG preview of the windward/leeward course (briefing screen)
// ============================================================================

// The chart is drawn on its own fixed dark water in both themes, so its inks are
// fixed too. Cyan means an action, the selected section or an active control
// (DESIGN.md), and nothing on this chart is pressed: the wind is the light
// neutral ink of the race overview map, the upwind route a muted neutral, the
// marks and the start line the warning amber and the run home the success
// green. Contrast on the darkest water: 16.5, 11.0, 9.7 and 14.0 to 1.
export const COURSE_PREVIEW_INK = { wind: "#e8f4f8", upwind: "#b8cad6" } as const;

function CoursePreview() {
  const { tp } = useI18n();
  // Hardcoded RU labels were leaking into PL / EN / etc. on the
  // briefing screen. Localize all five SVG <text> nodes via tp().
  const labelWind = tp('ветер', 'wind', 'wiatr',
    { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' });
  const labelTopMark = tp('верхний знак', 'windward mark', 'znak nawietrzny',
    { es: 'baliza de barlovento', fr: 'bouée au vent', de: 'Luvtonne', it: 'boa di bolina' });
  const labelStartFinish = tp('старт / финиш', 'start / finish', 'start / meta',
    { es: 'salida / llegada', fr: 'départ / arrivée', de: 'Start / Ziel', it: 'partenza / arrivo' });
  const legendUpwind = tp('-- ходом против ветра (галсы)', '-- upwind (tacks)', '-- pod wiatr (halsami)',
    { es: '-- en ceñida (bordos)', fr: '-- au près (bords)', de: '-- gegen den Wind (Kreuzschläge)', it: '-- di bolina (bordi)' });
  const legendDownwind = tp('-- попутно к финишу', '-- downwind to finish', '-- z wiatrem do mety',
    { es: '-- a favor del viento a la llegada', fr: '-- au portant jusqu\'à l\'arrivée', de: '-- mit dem Wind zum Ziel', it: '-- vento in poppa all\'arrivo' });
  // Keep whole words in the annotation band beside the mark. Long translated
  // labels use another line instead of depending on the platform system font.
  const topMarkLines = labelTopMark.split(' ').reduce<string[]>((lines, word) => {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 14) lines[last] += ` ${word}`;
    else lines.push(word);
    return lines;
  }, []);
  return (
    <svg viewBox="0 0 220 274" className="w-full max-w-[242px] mx-auto block" fontFamily="var(--font-geist-sans, sans-serif)">
      {/* water */}
      <defs>
        <linearGradient id="cpWater" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#051425" />
          <stop offset="100%" stopColor="#0a1f3d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="220" height="274" rx="8" fill="url(#cpWater)" />
      <g transform="translate(10 0)">
      {/* wind arrow */}
      <g stroke={COURSE_PREVIEW_INK.wind} strokeWidth="1.4" fill={COURSE_PREVIEW_INK.wind}>
        <line x1="100" y1="10" x2="100" y2="40" />
        <polygon points="96,38 100,48 104,38" />
        <text x="108" y="28" fill={COURSE_PREVIEW_INK.wind} stroke="none" fontSize="11">{labelWind}</text>
      </g>
      {/* windward mark */}
      <circle cx="100" cy="60" r="7" fill="#ffaa00" stroke="#fff" strokeWidth="1.5" />
      <text x="112" y="64" fill="#ffaa00" fontSize="10" aria-label={labelTopMark}>
        {topMarkLines.map((line, index) => <tspan key={index} x="112" dy={index === 0 ? 0 : 12}>{index ? ` ${line}` : line}</tspan>)}
      </text>
      {/* start/finish line */}
      <line x1="60" y1="220" x2="140" y2="220" stroke="#ffaa00" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="60" cy="220" r="4" fill="#ffaa00" />
      <circle cx="140" cy="220" r="4" fill="#ffaa00" />
      <text x="85" y="240" fill="#ffaa00" fontSize="10" textAnchor="middle">{labelStartFinish}</text>
      {/* route */}
      <polyline
        fill="none"
        stroke={COURSE_PREVIEW_INK.upwind}
        strokeWidth="1.5"
        strokeDasharray="3 3"
        points="100,220 75,170 120,130 90,95 100,65"
      />
      <polyline
        fill="none"
        stroke="#44ff88"
        strokeWidth="1.5"
        points="100,65 115,120 95,180 100,220"
      />
      {/* boat start */}
      <circle cx="100" cy="220" r="3" fill={COURSE_PREVIEW_INK.wind} />
      {/* legend */}
      <g fontSize="10">
        <text x="10" y="250" fill={COURSE_PREVIEW_INK.upwind}>{legendUpwind}</text>
        <text x="10" y="260" fill="#44ff88">{legendDownwind}</text>
      </g>
      </g>
    </svg>
  );
}
