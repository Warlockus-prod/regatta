'use client';

import { FoundationReturn } from "@/components/FoundationReturn";

import { useEffect, useState } from 'react';
import { useRaceCopy } from "./race-copy";
import { useI18n } from '@/lib/i18n';
import { missions, type Mission } from '@/data/missions';
import { RaceModePicker } from "./RaceCockpit";
import type { RacePrefs } from "./race-prefs";
import { LobbyVenues } from "./LobbyVenues";
import { DIFFICULTY_CONFIG, type Difficulty } from './config';
import { TargetIcon } from "@/features/race-hud/RaceIcons";
import { linkedRaceSetup } from "@/lib/race-setup";
import { readRaceSearch } from "@/lib/race-native-env";
import type { MedalCourse } from "@/lib/race-medals";
import { RaceMedalLine } from "./RaceMedal";
import { RaceDailyEntry, RaceNextStepCard, readLobbyHome } from "./RaceNextStep";
import { localStore } from "./race-model";
import { dailyRaceDay } from "@/lib/race-next-step";
import { raceReturnFor } from "@/lib/race-return";

// ============================================================================
// GameMenu - the race lobby (M1-1, M1-6). One setup screen: a race frame, three
// presets (First race / Free / Mission), the mode and the venue as compact
// choices, and one primary action that starts the race. The briefing opens by
// itself only the first time on a course; the "i" button beside the start
// opens it on request. Inside the app the Race hub already chose the mode and
// the venue, so the lobby only shows the mode and never asks again.
// ============================================================================

type MenuTab = 'learn' | 'free' | 'mission';

/** M4-2: a link with its own level and wind (the way back from a practice of
 * the race debrief) opens on "Free race" with them, not on "First race",
 * whose easy/medium defaults would replace the linked conditions. A mission
 * or a daily link owns its own presets; any other link opens "First race". */
export function linkedMenuTab(query: URLSearchParams): MenuTab {
  const linked = linkedRaceSetup(query);
  return linked && !linked.missionId && !linked.dailyDay ? 'free' : 'learn';
}

/** The race frame: an existing editorial still, not a new asset (site only). */
export const LOBBY_HERO_SRC = "/design-v3/sailing-editorial.webp";

export function GameMenu({
  difficulty, setDifficulty,
  windStrength, setWindStrength,
  selectedMission, pickMission,
  onStart, onShowBriefing, racePrefs, updateRacePrefs, dailyDay, native = false, medalCourse = null,
}: {
  dailyDay: string | null;
  racePrefs: RacePrefs; updateRacePrefs: (patch: Partial<RacePrefs>) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  windStrength: 'light' | 'medium' | 'heavy';
  setWindStrength: (w: 'light' | 'medium' | 'heavy') => void;
  selectedMission: Mission | null;
  pickMission: (m: Mission | null) => void;
  /** The primary action: the briefing on a first visit, otherwise the countdown. */
  onStart: () => void;
  /** The "i" button: always the briefing. */
  onShowBriefing: () => void;
  /** Inside the app: the hub owns the mode and the venue. */
  native?: boolean;
  /** M4-5: the course whose medal and next goal the lobby shows; none for the physical trial. */
  medalCourse?: MedalCourse | null;
}) {
  const { tp, tl } = useI18n();
  const raceCopy = useRaceCopy();
  // The initial tab comes from the link, on every mount: /game is client-only
  // (page.tsx, ssr: false), so no server render disagrees with it.
  const [tab, setTab] = useState<MenuTab>(() => linkedMenuTab(readRaceSearch()));

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

  const level = difficultyLabel(difficulty);
  const ctaLabel =
    dailyDay ? tl({ ru: 'Начать гонку дня', en: 'Start the daily race', pl: 'Zacznij wyścig dnia', es: 'Empezar la regata del día', fr: 'Lancer la course du jour', de: 'Tagesrennen starten', it: 'Inizia la regata del giorno' }) :
    tab === 'learn' ? tl({ ru: 'Начать первую гонку', en: 'Start your first race', pl: 'Zacznij pierwszy wyścig', es: 'Empezar la primera regata', fr: 'Lancer la première course', de: 'Erstes Rennen starten', it: 'Inizia la prima regata' }) :
    tab === 'mission' ? (selectedMission
      ? tp(`К миссии: ${selectedMission.titleRu}`, `To mission: ${selectedMission.titleEn}`, `Do misji: ${selectedMission.titlePl}`, {
          es: `Ir a la misión: ${selectedMission.titleEs ?? selectedMission.titleEn}`,
          fr: `Vers la mission : ${selectedMission.titleFr ?? selectedMission.titleEn}`,
          de: `Zur Mission: ${selectedMission.titleDe ?? selectedMission.titleEn}`,
          it: `Vai alla missione: ${selectedMission.titleIt ?? selectedMission.titleEn}`,
        })
      : tp('Выбери миссию', 'Pick a mission', 'Wybierz misję', { es: 'Elige una misión', fr: 'Choisis une mission', de: 'Wähle eine Mission', it: 'Scegli una missione' })) :
    tl({ ru: `Старт · ${level}`, en: `Start · ${level}`, pl: `Start · ${level}`, es: `Empezar · ${level}`, fr: `Départ · ${level}`, de: `Start · ${level}`, it: `Inizia · ${level}` });

  const ctaDisabled = tab === 'mission' && !selectedMission && !dailyDay;
  // M4-6: the one next-step card, the record and the progress (site only: in
  // the app the native Race hub shows them). None for the physical trial.
  const medalShown = tab !== 'mission' || Boolean(selectedMission) || Boolean(dailyDay);
  const home = medalCourse && !native
    // Only today's daily lobby is "in the daily race": an old daily link still offers today's.
    ? readLobbyHome(localStore(), medalCourse, racePrefs.mode, { inDaily: dailyDay !== null && dailyDay === dailyRaceDay(new Date()), courseChosen: medalShown })
    : null;
  const briefingLabel = tl({ ru: 'Брифинг: трасса и правила', en: 'Briefing: course and rules', pl: 'Odprawa: trasa i zasady', es: 'Briefing: recorrido y reglas', fr: 'Briefing : parcours et règles', de: 'Briefing: Bahn und Regeln', it: 'Briefing: percorso e regole' });

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6" data-testid="race-lobby">
      <FoundationReturn />
      {!native && (
        <div className="mb-4 h-32 sm:h-48 overflow-hidden rounded-2xl bg-[var(--bg-secondary)]" data-testid="race-lobby-hero">
          {/* eslint-disable-next-line @next/next/no-img-element -- one local still, the same file the home page uses */}
          <img src={LOBBY_HERO_SRC} alt="" decoding="async" className="h-full w-full object-cover" style={{ objectPosition: '70% 55%' }} />
        </div>
      )}
      <div className="mb-5">
        <h1 tabIndex={-1} className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] mb-1">
          {tp('Гонка', 'Race', 'Wyścig', { es: 'Regata', fr: 'Course', de: 'Rennen', it: 'Regata' })}
        </h1>
        <p className="text-base text-[var(--text-secondary)]">
          {tl({ ru: 'Выбери режим гонки', en: 'Pick a race mode', pl: 'Wybierz tryb wyścigu', es: 'Elige un modo de regata', fr: 'Choisis un mode de course', de: 'Wähle einen Rennmodus', it: 'Scegli una modalità di regata' })}
        </p>
      </div>

      {home && <RaceNextStepCard view={home} mode={racePrefs.mode}
        practiceReturn={raceReturnFor({ difficulty, windStrength, missionId: selectedMission?.id ?? null, dailyDay, fromLesson: readRaceSearch().get("fromLesson") })} />}

      {dailyDay && <p className="mb-4 text-base font-semibold text-[var(--text-primary)]" data-testid="race-lobby-daily">{dailyDay}</p>}
      {/* Compact presets keep the start action visible on a phone. */}
      <div hidden={Boolean(dailyDay)} className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 mb-4">
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
          title={tp('Свободная гонка', 'Free race', 'Wyścig swobodny', { es: 'Regata libre', fr: 'Course libre', de: 'Freies Rennen', it: 'Regata libera' })}
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

      {/* M4-6: the website's entry to today's daily race, unless the card above is it. */}
      {home && dailyDay !== home.daily.day && home.step?.kind !== 'daily' && <RaceDailyEntry view={home} />}

      {/* Tab-specific controls */}
      {tab === 'mission' && !dailyDay && (
        <div className="card p-4 mb-4">
          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('ВЫБЕРИ МИССИЮ', 'PICK A MISSION', 'WYBIERZ MISJĘ', { es: 'ELIGE UNA MISIÓN', fr: 'CHOISIS UNE MISSION', de: 'WÄHLE EINE MISSION', it: 'SCEGLI UNA MISSIONE' })}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="radiogroup" aria-label={tp('Миссия', 'Mission', 'Misja', { es: 'Misión', fr: 'Mission', de: 'Mission', it: 'Missione' })}>
            {missions.map((m) => {
              const active = selectedMission?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pickMission(m)}
                  className="min-h-11 p-3 rounded-lg text-left text-sm transition border"
                  style={{
                    borderColor: active ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                    outlineColor: 'var(--accent-cyan)',
                  }}
                >
                  {/* M1-7: a line icon in place of the mission emoji; the title is the name. */}
                  <div className="font-semibold text-[var(--text-primary)] flex items-start gap-1.5"><TargetIcon className="mt-1 shrink-0 text-[var(--text-secondary)]" /><span className="line-clamp-2">{mTitle(m)}</span></div>
                </button>
              );
            })}
          </div>
          {selectedMission && (
            <div className="mt-3 text-sm leading-6">
              <div className="text-[var(--text-secondary)] mb-1">{mDesc(selectedMission)}</div>
              <div className="text-[var(--text-secondary)]">{tp(selectedMission.hintRu, selectedMission.hintEn, selectedMission.hintPl, { es: selectedMission.hintEs, fr: selectedMission.hintFr, de: selectedMission.hintDe, it: selectedMission.hintIt })}</div>
              <div className="text-[var(--text-muted)] mt-1">
                {tp('Автонастройки', 'Auto-settings', 'Ustawienia automatyczne', { es: 'Ajustes automáticos', fr: 'Réglages auto', de: 'Automatische Einstellungen', it: 'Impostazioni automatiche' })}: {difficultyLabel(selectedMission.difficulty)} · {tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })} {windLabel(selectedMission.windStrength)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'free' && !dailyDay && (
        <div className="card p-4 mb-4 space-y-4">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('СЛОЖНОСТЬ', 'DIFFICULTY', 'POZIOM', { es: 'DIFICULTAD', fr: 'DIFFICULTÉ', de: 'SCHWIERIGKEIT', it: 'DIFFICOLTÀ' })}</div>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={tp('Сложность', 'Difficulty', 'Poziom', { es: 'Dificultad', fr: 'Difficulté', de: 'Schwierigkeit', it: 'Difficoltà' })}>
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => {
                const cfg = DIFFICULTY_CONFIG[d];
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDifficulty(d)}
                    className="min-h-11 p-2.5 rounded-lg text-left text-sm transition border"
                    style={{ borderColor: active ? 'var(--accent-cyan)' : 'var(--border-subtle)', outlineColor: 'var(--accent-cyan)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <div className="font-semibold text-[var(--text-primary)]">{tp(cfg.label, cfg.labelEn, cfg.labelPl, { es: cfg.labelEs, fr: cfg.labelFr, de: cfg.labelDe, it: cfg.labelIt })}</div>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{cfg.opponents} {tp('соперника', 'opponents', 'rywali', { es: 'rivales', fr: 'adversaires', de: 'Gegner', it: 'avversari' })}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('СИЛА ВЕТРА', 'WIND STRENGTH', 'SIŁA WIATRU', { es: 'FUERZA DEL VIENTO', fr: 'FORCE DU VENT', de: 'WINDSTÄRKE', it: 'FORZA DEL VENTO' })}</div>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={tp('Сила ветра', 'Wind strength', 'Siła wiatru', { es: 'Fuerza del viento', fr: 'Force du vent', de: 'Windstärke', it: 'Forza del vento' })}>
              {([
                { id: 'light',  label: tp('Слабый',  'Light',  'Słaby', { es: 'Flojo', fr: 'Faible', de: 'Schwach', it: 'Leggero' }),  desc: '~8 kn'  },
                { id: 'medium', label: tp('Средний', 'Medium', 'Średni', { es: 'Medio', fr: 'Moyen', de: 'Mittel', it: 'Medio' }), desc: '~12 kn' },
                { id: 'heavy',  label: tp('Сильный', 'Strong', 'Silny', { es: 'Fuerte', fr: 'Fort', de: 'Stark', it: 'Forte' }),  desc: '~16 kn' },
              ] as const).map((w) => (
                <button
                  key={w.id}
                  type="button"
                  role="radio"
                  aria-checked={windStrength === w.id}
                  onClick={() => setWindStrength(w.id)}
                  className="min-h-11 p-2.5 rounded-lg border transition text-center"
                  style={{ borderColor: windStrength === w.id ? 'var(--accent-cyan)' : 'var(--border-subtle)', outlineColor: 'var(--accent-cyan)' }}
                >
                  <div className="text-sm font-semibold" style={{ color: windStrength === w.id ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{w.label}</div>
                  <div className="text-xs text-[var(--text-muted)]">{w.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {medalCourse && medalShown && home?.step?.kind !== 'medal' && <RaceMedalLine course={medalCourse} mode={racePrefs.mode} />}

      {native ? (
        <p className="mb-4 text-base leading-6 text-[var(--text-secondary)]" data-testid="race-lobby-mode">
          <span className="font-semibold text-[var(--text-primary)]">{tl({ ru: 'Режим', en: 'Mode', pl: 'Tryb', es: 'Modo', fr: 'Mode', de: 'Modus', it: 'Modalità' })}: {racePrefs.mode === 'pro' ? raceCopy.pro : raceCopy.simple}.</span>{' '}
          {tl({ ru: 'Режим выбирается в разделе Гонка.', en: 'Choose the mode in the Race tab.', pl: 'Tryb wybierasz w zakładce Regaty.', es: 'El modo se elige en la pestaña Regata.', fr: "Le mode se choisit dans l'onglet Course.", de: 'Den Modus wählst du im Tab Rennen.', it: 'La modalità si sceglie nella scheda Regata.' })}
        </p>
      ) : (
        <div className="mb-4"><RaceModePicker prefs={racePrefs} update={updateRacePrefs} /></div>
      )}
      {!native && <LobbyVenues />}

      {/* One primary action, pinned to the bottom of the lobby's scroll area. */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 flex gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
        <button
          type="button"
          onClick={onStart}
          disabled={ctaDisabled}
          data-testid="race-lobby-start"
          className="flex-1 min-h-[52px] py-3 rounded-xl font-semibold text-lg transition-colors disabled:opacity-40 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
          style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink)' }}
        >
          {ctaLabel} →
        </button>
        <button
          type="button"
          onClick={onShowBriefing}
          disabled={ctaDisabled}
          aria-label={briefingLabel}
          title={briefingLabel}
          data-testid="race-lobby-briefing"
          className="shrink-0 min-h-[52px] min-w-[52px] rounded-xl border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
          </svg>
        </button>
      </div>
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${title}. ${subtitle}. ${desc}`}
      className="card min-h-11 p-3 md:p-4 grid grid-cols-[28px_1fr] gap-x-3 md:block text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
      style={{ borderColor: active ? 'var(--accent-cyan)' : undefined }}
    >
      <div className="row-span-2 self-center md:mb-2" style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}><PresetIcon kind={icon} /></div>
      <div className="font-semibold text-base text-[var(--text-primary)]">{title}</div>
      <div className="text-sm text-[var(--text-muted)] md:mb-2">{subtitle}</div>
      <p className="hidden md:block text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
    </button>
  );
}
