'use client';

import { FoundationReturn } from "@/components/FoundationReturn";

import { useEffect, useState } from 'react';
import { useRaceCopy } from "./race-copy";
import { useI18n } from '@/lib/i18n';
import { missions, type Mission } from '@/data/missions';
import { RaceModePicker } from "./RaceCockpit";
import type { RacePrefs } from "./race-prefs";
import { VenuePicker } from '@/features/venues/VenuePicker';
import { DIFFICULTY_CONFIG, type Difficulty } from './config';

// ============================================================================
// GameMenu - 3-preset entry (Учусь / Свободная / Миссия) with collapsible details
// ============================================================================

type MenuTab = 'learn' | 'free' | 'mission';

export function GameMenu({
  difficulty, setDifficulty,
  windStrength, setWindStrength,
  selectedMission, pickMission,
  openBriefing, racePrefs, updateRacePrefs, dailyDay,
}: {
  dailyDay: string | null;
  racePrefs: RacePrefs; updateRacePrefs: (patch: Partial<RacePrefs>) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  windStrength: 'light' | 'medium' | 'heavy';
  setWindStrength: (w: 'light' | 'medium' | 'heavy') => void;
  selectedMission: Mission | null;
  pickMission: (m: Mission | null) => void;
  openBriefing: () => void;
}) {
  const { tp, tl } = useI18n();
  const raceCopy = useRaceCopy();
  const [tab, setTab] = useState<MenuTab>('learn');
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => { if (selectedMission) setTab("mission"); }, [selectedMission]);

  // Wind-label helper used in several places in this menu.
  const windLabel = (w: 'light' | 'medium' | 'heavy') =>
    w === 'light' ? tp('слабый', 'light', 'słaby', { es: 'flojo', fr: 'faible', de: 'schwach', it: 'leggero' })
    : w === 'heavy' ? tp('сильный', 'heavy', 'silny', { es: 'fuerte', fr: 'fort', de: 'stark', it: 'forte' })
    : tp('средний', 'medium', 'średni', { es: 'medio', fr: 'moyen', de: 'mittel', it: 'medio' });

  // Mission field pickers - mission titles / descriptions / hints are stored
  // with *Ru/*En/*Pl/*Es/*Fr/*De/*It variants on src/data/missions.ts.
  const mTitle = (m: Mission) => tp(m.titleRu, m.titleEn, m.titlePl, { es: m.titleEs, fr: m.titleFr, de: m.titleDe, it: m.titleIt });
  const mDesc = (m: Mission) => tp(m.descRu, m.descEn, m.descPl, { es: m.descEs, fr: m.descFr, de: m.descDe, it: m.descIt });

  // Difficulty label picker. DIFFICULTY_CONFIG has `label` (RU, legacy
  // name), labelEn, labelPl, labelEs, labelFr, labelDe, labelIt.
  const difficultyLabel = (d: Difficulty) =>
    tp(DIFFICULTY_CONFIG[d].label, DIFFICULTY_CONFIG[d].labelEn, DIFFICULTY_CONFIG[d].labelPl, { es: DIFFICULTY_CONFIG[d].labelEs, fr: DIFFICULTY_CONFIG[d].labelFr, de: DIFFICULTY_CONFIG[d].labelDe, it: DIFFICULTY_CONFIG[d].labelIt });

  // When tab changes, apply defaults
  useEffect(() => {
    if (dailyDay) return;
    if (tab === 'learn') {
      pickMission(null);
      setDifficulty('easy');
      setWindStrength('medium');
    } else if (tab === 'free') {
      pickMission(null);
      // keep user's manual selection
    }
    // mission tab: user picks mission -> it sets difficulty + wind automatically
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dailyDay]);

  const ctaLabel =
    tab === 'learn' ? tl({ ru: 'Начать первую гонку', en: 'Start your first race', pl: 'Zacznij pierwszy wyścig', es: 'Empezar la primera regata', fr: 'Lancer la première course', de: 'Erstes Rennen starten', it: 'Inizia la prima regata' }) :
    tab === 'mission' ? (selectedMission
      ? tp(`К миссии: ${selectedMission.titleRu}`, `To mission: ${selectedMission.titleEn}`, `Do misji: ${selectedMission.titlePl}`, {
          es: `Ir a la misión: ${selectedMission.titleEs ?? selectedMission.titleEn}`,
          fr: `Vers la mission : ${selectedMission.titleFr ?? selectedMission.titleEn}`,
          de: `Zur Mission: ${selectedMission.titleDe ?? selectedMission.titleEn}`,
          it: `Vai alla missione: ${selectedMission.titleIt ?? selectedMission.titleEn}`,
        })
      : tp('Выбери миссию', 'Pick a mission', 'Wybierz misję', { es: 'Elige una misión', fr: 'Choisis une mission', de: 'Wähle eine Mission', it: 'Scegli una missione' })) :
    tp(
      `К брифингу · ${DIFFICULTY_CONFIG[difficulty].label}`,
      `To briefing · ${DIFFICULTY_CONFIG[difficulty].labelEn}`,
      `Do odprawy · ${DIFFICULTY_CONFIG[difficulty].labelPl}`,
      {
        es: `Al briefing · ${DIFFICULTY_CONFIG[difficulty].labelEs}`,
        fr: `Vers le briefing · ${DIFFICULTY_CONFIG[difficulty].labelFr}`,
        de: `Zum Briefing · ${DIFFICULTY_CONFIG[difficulty].labelDe}`,
        it: `Al briefing · ${DIFFICULTY_CONFIG[difficulty].labelIt}`,
      },
    );

  const ctaDisabled = tab === 'mission' && !selectedMission;

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <FoundationReturn />
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] mb-1">
          {tp('Гонка', 'Race', 'Wyścig', { es: 'Regata', fr: 'Course', de: 'Rennen', it: 'Regata' })}
        </h1>
        <p className="text-base text-[var(--text-secondary)]">
          {tl({ ru: 'Выбери режим гонки', en: 'Pick a race mode', pl: 'Wybierz tryb wyścigu', es: 'Elige un modo de regata', fr: 'Choisis un mode de course', de: 'Wähle einen Rennmodus', it: 'Scegli una modalità di regata' })}
        </p>
      </div>

      {dailyDay && <p className="mb-4 text-[var(--accent-cyan)]">{dailyDay}</p>}
      {/* Compact presets keep the start action visible on a phone. */}
      <div hidden={Boolean(dailyDay)} className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <PresetCard
          active={tab === 'learn'}
          onClick={() => setTab('learn')}
          icon="first"
          title={tl({ ru: 'Первая гонка', en: 'First race', pl: 'Pierwszy wyścig', es: 'Primera regata', fr: 'Première course', de: 'Erstes Rennen', it: 'Prima regata' })}
          subtitle={tl({ ru: 'Лёгкий уровень, средний ветер', en: 'Easy level, medium wind', pl: 'Łatwy poziom, średni wiatr', es: 'Nivel fácil, viento medio', fr: 'Niveau facile, vent moyen', de: 'Leichte Stufe, mittlerer Wind', it: 'Livello facile, vento medio' })}
          desc={tp(
            'Спокойные противники, плавные повороты. Для первого опыта гонки.',
            'Calm opponents, gentle turns. For a first racing experience.',
            'Spokojni rywale, łagodne zwroty. Na pierwsze regatowe doświadczenie.',
            {
              es: 'Rivales tranquilos, viradas suaves. Para tu primera experiencia de regata.',
              fr: 'Adversaires calmes, virements en douceur. Pour une première expérience de course.',
              de: 'Ruhige Gegner, sanfte Wenden. Für dein erstes Regatta-Erlebnis.',
              it: 'Avversari tranquilli, virate morbide. Per una prima esperienza di regata.',
            },
          )}
        />
        <PresetCard
          active={tab === 'free'}
          onClick={() => setTab('free')}
          icon="free"
          title={tp('Свободная гонка', 'Free race', 'Wolny wyścig', { es: 'Regata libre', fr: 'Course libre', de: 'Freies Rennen', it: 'Regata libera' })}
          subtitle={tp('Сам выбираешь', 'You choose', 'Ty decydujesz', { es: 'Tú eliges', fr: 'Tu choisis', de: 'Du entscheidest', it: 'Scegli tu' })}
          desc={tp(
            'Выбирай сложность и ветер. Без конкретной задачи.',
            'Choose difficulty and wind. No specific objective.',
            'Wybierz poziom i wiatr. Bez konkretnego zadania.',
            {
              es: 'Elige dificultad y viento. Sin un objetivo concreto.',
              fr: 'Choisis la difficulté et le vent. Sans objectif précis.',
              de: 'Wähle Schwierigkeit und Wind. Ohne festes Ziel.',
              it: 'Scegli difficoltà e vento. Senza un obiettivo preciso.',
            },
          )}
        />
        <PresetCard
          active={tab === 'mission'}
          onClick={() => setTab('mission')}
          icon="mission"
          title={tp('Миссия', 'Mission', 'Misja', { es: 'Misión', fr: 'Mission', de: 'Mission', it: 'Missione' })}
          subtitle={tp('Конкретная задача', 'Specific objective', 'Konkretny cel', { es: 'Objetivo concreto', fr: 'Objectif précis', de: 'Konkretes Ziel', it: 'Obiettivo preciso' })}
          desc={tp(
            '4 сценария: чистая гонка, под 90 сек, мин. галсов, слабый ветер.',
            '4 scenarios: clean race, under 90 sec, min tacks, light wind.',
            '4 scenariusze: czysty wyścig, poniżej 90 s, minimum zwrotów, słaby wiatr.',
            {
              es: '4 escenarios: regata limpia, menos de 90 s, pocas viradas, viento flojo.',
              fr: '4 scénarios : course propre, moins de 90 s, peu de virements, vent faible.',
              de: '4 Szenarien: sauberes Rennen, unter 90 s, wenige Wenden, Leichtwind.',
              it: '4 scenari: regata pulita, sotto i 90 s, poche virate, vento leggero.',
            },
          )}
        />
      </div>

      {/* Tab-specific controls */}
      {tab === 'mission' && (
        <div className="card p-4 mb-5">
          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('ВЫБЕРИ МИССИЮ', 'PICK A MISSION', 'WYBIERZ MISJĘ', { es: 'ELIGE UNA MISIÓN', fr: 'CHOISIS UNE MISSION', de: 'WÄHLE EINE MISSION', it: 'SCEGLI UNA MISSIONE' })}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {missions.map((m) => {
              const active = selectedMission?.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => pickMission(m)}
                  className={`p-3 rounded-lg text-left text-xs transition border ${active ? 'ring-1' : 'opacity-80 hover:opacity-100'}`}
                  style={{
                    borderColor: active ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                    background: active ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                    outlineColor: 'var(--accent-cyan)',
                  }}
                >
                  <div className="text-lg mb-1">{m.emoji}</div>
                  <div className="font-semibold text-[var(--text-primary)] line-clamp-1">{mTitle(m)}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{mDesc(m)}</div>
                </button>
              );
            })}
          </div>
          {selectedMission && (
            <div className="mt-3 p-3 rounded text-xs" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
              <div className="text-[var(--text-primary)] font-semibold mb-1">
                {selectedMission.emoji} {mTitle(selectedMission)}
              </div>
              <div className="text-[var(--text-secondary)] leading-relaxed mb-1">{mDesc(selectedMission)}</div>
              <div className="text-[var(--accent-cyan)]">💡 {tp(selectedMission.hintRu, selectedMission.hintEn, selectedMission.hintPl, { es: selectedMission.hintEs, fr: selectedMission.hintFr, de: selectedMission.hintDe, it: selectedMission.hintIt })}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">
                {tp('Автонастройки', 'Auto-settings', 'Ustawienia automatyczne', { es: 'Ajustes automáticos', fr: 'Réglages auto', de: 'Automatische Einstellungen', it: 'Impostazioni automatiche' })}: {difficultyLabel(selectedMission.difficulty)} · {tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })} {windLabel(selectedMission.windStrength)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'free' && !dailyDay && (
        <div className="card p-4 mb-5 space-y-4">
          {/* Difficulty */}
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('СЛОЖНОСТЬ', 'DIFFICULTY', 'POZIOM', { es: 'DIFICULTAD', fr: 'DIFFICULTÉ', de: 'SCHWIERIGKEIT', it: 'DIFFICOLTÀ' })}</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => {
                const cfg = DIFFICULTY_CONFIG[d];
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`p-2.5 rounded-lg text-left text-xs transition border ${active ? 'ring-1' : ''}`}
                    style={{
                      borderColor: active ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                      background: active ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                      outlineColor: 'var(--accent-cyan)',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <div className="font-semibold text-[var(--text-primary)]">{tp(cfg.label, cfg.labelEn, cfg.labelPl, { es: cfg.labelEs, fr: cfg.labelFr, de: cfg.labelDe, it: cfg.labelIt })}</div>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{cfg.opponents} {tp('соперника', 'opponents', 'rywali', { es: 'rivales', fr: 'adversaires', de: 'Gegner', it: 'avversari' })}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Wind */}
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('СИЛА ВЕТРА', 'WIND STRENGTH', 'SIŁA WIATRU', { es: 'FUERZA DEL VIENTO', fr: 'FORCE DU VENT', de: 'WINDSTÄRKE', it: 'FORZA DEL VENTO' })}</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'light',  label: tp('Слабый',  'Light',  'Słaby', { es: 'Flojo', fr: 'Faible', de: 'Schwach', it: 'Leggero' }),  desc: '~8 kn'  },
                { id: 'medium', label: tp('Средний', 'Medium', 'Średni', { es: 'Medio', fr: 'Moyen', de: 'Mittel', it: 'Medio' }), desc: '~12 kn' },
                { id: 'heavy',  label: tp('Сильный', 'Strong', 'Silny', { es: 'Fuerte', fr: 'Fort', de: 'Stark', it: 'Forte' }),  desc: '~16 kn' },
              ] as const).map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWindStrength(w.id)}
                  className={`p-2.5 rounded-lg border transition text-center ${windStrength === w.id ? 'ring-1' : ''}`}
                  style={{
                    borderColor: windStrength === w.id ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                    background: windStrength === w.id ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                    outlineColor: 'var(--accent-cyan)',
                  }}
                >
                  <div className="text-xs font-semibold" style={{ color: windStrength === w.id ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{w.label}</div>
                  <div className="text-xs text-[var(--text-muted)]">{w.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <RaceModePicker prefs={racePrefs} update={updateRacePrefs} />
      <button
        onClick={openBriefing}
        disabled={ctaDisabled}
        className="w-full mb-4 min-h-[52px] py-3 rounded-xl font-semibold text-lg transition-colors disabled:opacity-40 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
        style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}
      >
        {ctaLabel} →
      </button>
      <VenuePicker />

      {/* Collapsible details panel (controls + course rules) */}
      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="w-full mb-4 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1 transition"
      >
        <span>{detailsOpen
          ? tp('Скрыть детали', 'Hide details', 'Ukryj szczegóły', { es: 'Ocultar detalles', fr: 'Masquer les détails', de: 'Details ausblenden', it: 'Nascondi i dettagli' })
          : tp('Показать управление и правила трассы', 'Show controls and course rules', 'Pokaż sterowanie i zasady trasy', { es: 'Ver controles y reglas del recorrido', fr: 'Afficher les commandes et les règles du parcours', de: 'Steuerung und Bahnregeln anzeigen', it: 'Mostra comandi e regole del percorso' })
        }</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             style={{ transform: detailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {detailsOpen && (
        <div className="card p-4 mb-5 space-y-4">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('УПРАВЛЕНИЕ', 'CONTROLS', 'STEROWANIE', { es: 'CONTROLES', fr: 'COMMANDES', de: 'STEUERUNG', it: 'COMANDI' })}</div>
            <p className="text-sm text-[var(--text-secondary)]">{racePrefs.mode === "pro" ? raceCopy.proNote : raceCopy.simpleNote}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">{tl({ ru: "← →: руль. В Pro Q/A: гика-шкот, W/S: стаксель-шкот.", en: "← →: helm. In Pro, Q/A: mainsheet; W/S: jib sheet.", pl: "← →: ster. W Pro Q/A: szot grota, W/S: szot foka.", es: "← →: timón. En Pro, Q/A: escota de mayor; W/S: escota de foque.", fr: "← → : barre. En Pro, Q/A : écoute de grand-voile ; W/S : écoute de foc.", de: "← →: Steuer. In Pro Q/A: Großschot, W/S: Fockschot.", it: "← →: timone. In Pro Q/A: scotta della randa, W/S: scotta del fiocco." })}</p>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('ТРАССА', 'COURSE', 'TRASA', { es: 'RECORRIDO', fr: 'PARCOURS', de: 'BAHN', it: 'PERCORSO' })}</div>
            <ol className="text-xs text-[var(--text-secondary)] space-y-1 list-decimal list-inside leading-relaxed">
              <li>{tp('Старт от нижней оранжевой линии (там же финиш).', 'Start from the bottom orange line (that\'s also the finish).', 'Start z dolnej pomarańczowej linii (tam jest też meta).', { es: 'Salida desde la línea naranja de abajo (también es la llegada).', fr: 'Départ depuis la ligne orange du bas (c\'est aussi l\'arrivée).', de: 'Start an der unteren orangen Linie (dort ist auch das Ziel).', it: 'Partenza dalla linea arancione in basso (è anche l\'arrivo).' })}</li>
              <li>{tp('Идёшь к верхнему знаку галсами - ветер сверху.', 'Tack your way up to the windward mark - the wind blows from the top.', 'Do znaku nawietrznego płyniesz halsami - wiatr wieje z góry.', { es: 'Subes a la baliza de barlovento dando bordos - el viento viene de arriba.', fr: 'Tu remontes vers la bouée au vent en louvoyant - le vent vient du haut.', de: 'Zur Luvtonne kreuzt du auf - der Wind kommt von oben.', it: 'Risali verso la boa di bolina bordeggiando - il vento arriva dall\'alto.' })}</li>
              <li>{tp('Огибаешь знак, оставляя его по левому борту.', 'Round the mark, leaving it to port.', 'Okrążasz znak, zostawiając go po lewej burcie.', { es: 'Rodeas la baliza dejándola a babor.', fr: 'Tu contournes la bouée en la laissant à bâbord.', de: 'Du rundest die Tonne und lässt sie an Backbord.', it: 'Giri la boa lasciandola a sinistra.' })}</li>
              <li>{tp('Возвращаешься полным курсом и пересекаешь финиш сверху вниз.', 'Run back downwind and cross the finish top to bottom.', 'Wracasz kursem pełnym i przecinasz linię mety z góry na dół.', { es: 'Vuelve a favor del viento y cruza la línea de llegada de arriba abajo.', fr: 'Redescends au portant et coupe la ligne d\'arrivée de haut en bas.', de: 'Segle raumschots zurück und fahr von oben nach unten über die Ziellinie.', it: 'Torna con le andature portanti e taglia il traguardo dall\'alto verso il basso.' })}</li>
            </ol>
          </div>
        </div>
      )}


    </div>
  );
}

/** Line icons for the race modes, drawn in the text colour (cyan when picked). */
function PresetIcon({ kind }: { kind: 'first' | 'free' | 'mission' }) {
  const common = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (kind === 'first') return (
    <svg {...common}><path d="M12 3v14" /><path d="M12 4l6 11h-6" /><path d="M11 6l-5 9h5" /><path d="M4 18h16l-2 3H6z" /></svg>
  );
  if (kind === 'free') return (
    <svg {...common}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
  );
  return (
    <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></svg>
  );
}

function PresetCard({
  active, onClick, icon, title, subtitle, desc,
}: {
  active: boolean; onClick: () => void;
  icon: 'first' | 'free' | 'mission'; title: string; subtitle: string; desc: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${title}. ${subtitle}. ${desc}`}
      className="card p-3 md:p-4 grid grid-cols-[28px_1fr] gap-x-3 md:block text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
      style={{
        borderColor: active ? 'var(--accent-cyan)' : undefined,
        background: active ? 'rgba(0, 212, 255, 0.08)' : undefined,
      }}
    >
      <div className="row-span-2 self-center md:mb-2" style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}><PresetIcon kind={icon} /></div>
      <div className="font-semibold text-base text-[var(--text-primary)]">{title}</div>
      <div className="text-xs text-[var(--text-muted)] md:mb-2">{subtitle}</div>
      <p className="hidden md:block text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
    </button>
  );
}
