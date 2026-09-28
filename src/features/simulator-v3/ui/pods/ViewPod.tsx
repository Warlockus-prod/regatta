'use client';

import {
  COURSE_PRESETS,
  PodCard,
  PodLabel,
  PodSegmented,
  type SailsRaised,
  type TpFn,
  type UiState,
  type ViewMode,
} from '../shared';

export function ViewPod(props: {
  ui: UiState;
  setUi: React.Dispatch<React.SetStateAction<UiState>>;
  tp: TpFn;
  applyOptimal: () => void;
  resetAll: () => void;
  setPreset: (twa: number) => void;
  compact?: boolean;
  paused: boolean;
  togglePause: () => void;
  children?: React.ReactNode;
  section: "camera" | "session";
}) {
  const { ui, setUi, tp, applyOptimal, resetAll, setPreset, compact, paused, togglePause } = props;
  return (
    <PodCard compact={compact}>
      {props.section === "camera" && <>
      <div className="flex items-center gap-2" aria-label={tp("Вид и пауза", "View and pause", "Widok i pauza", { es: "Vista y pausa", fr: "Vue et pause", de: "Ansicht und Pause", it: "Vista e pausa" })}>
      <div className="flex-1 min-w-0">
      <PodSegmented
        compact={compact}
        options={[
          {
            value: 'top' as const,
            label: tp('Сверху', 'Top', 'Z góry', { es: 'Cenital', fr: 'Dessus', de: 'Oben', it: 'Alto' }),
          },
          {
            value: 'rear' as const,
            label: tp('Сзади', 'Rear', 'Z tyłu', { es: 'Popa', fr: 'Arrière', de: 'Heck', it: 'Poppa' }),
          },
          {
            value: 'side' as const,
            label: tp('Сбоку', 'Side', 'Z boku', { es: 'Lateral', fr: 'Côté', de: 'Seite', it: 'Lato' }),
          },
          { value: '3d' as const, label: "3D" },
        ]}
        active={ui.view}
        onSelect={(v) => setUi((p) => ({ ...p, view: v as ViewMode }))}
      />
      </div>
      <button onClick={togglePause} aria-pressed={paused} className="min-h-11 rounded-md border border-[var(--border-subtle)] px-2 text-xs text-[var(--text-primary)]">
        {paused ? tp("Продолжить", "Resume", "Wznów", { es: "Continuar", fr: "Reprendre", de: "Fortsetzen", it: "Riprendi" })
          : tp("Пауза", "Pause", "Pauza", { es: "Pausa", fr: "Pause", de: "Pause", it: "Pausa" })}
      </button>
      </div>
      </>}
      {props.section === "session" && <>
      <PodLabel text={tp("НАСТРОЙКИ СЕССИИ", "SESSION SETTINGS", "USTAWIENIA SESJI", { es: "AJUSTES DE SESIÓN", fr: "RÉGLAGES DE SESSION", de: "SITZUNGSEINSTELLUNGEN", it: "IMPOSTAZIONI SESSIONE" })} />
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{tp("Учебная помощь: курс удерживается, паруса переходят сами. Смена вида не сбрасывает лодку.", "Teaching assistance: course is held and sails transfer automatically. Changing view keeps the same boat state.", "Pomoc szkoleniowa: kurs jest utrzymywany, żagle przechodzą automatycznie. Zmiana widoku zachowuje stan jachtu.", { es: "Ayuda de aprendizaje: el rumbo se mantiene y las velas cambian de banda solas. Cambiar de vista no reinicia el barco.", fr: "Aide pédagogique : le cap est tenu et les voiles changent de bord seules. Changer de vue ne réinitialise pas le bateau.", de: "Lernhilfe: Der Kurs wird gehalten, die Segel gehen automatisch über. Ein Ansichtswechsel setzt das Boot nicht zurück.", it: "Aiuto didattico: la rotta è mantenuta e le vele passano da sole. Cambiare vista non azzera la barca." })}</p>
      <details>
        <summary className="cursor-pointer py-3 text-xs text-[var(--text-secondary)]">{tp("Паруса и курсы", "Sails and courses", "Żagle i kursy", { es: "Velas y rumbos", fr: "Voiles et allures", de: "Segel und Kurse", it: "Vele e andature" })}</summary>
        <div className="space-y-2 pb-2">
      <PodSegmented
        compact={compact}
        options={[
          {
            value: 'both' as const,
            label: tp('Оба', 'Both', 'Oba', { es: 'Ambas', fr: 'Deux', de: 'Beide', it: 'Entrambe' }),
          },
          {
            value: 'main' as const,
            label: tp('Грот', 'Main', 'Grot', { es: 'Mayor', fr: 'GV', de: 'Groß', it: 'Randa' }),
          },
          {
            value: 'jib' as const,
            label: tp('Стакс.', 'Jib', 'Fok', { es: 'Foque', fr: 'Foc', de: 'Fock', it: 'Fiocco' }),
          },
        ]}
        active={ui.sailsRaised}
        onSelect={(v) => setUi((p) => ({ ...p, sailsRaised: v as SailsRaised }))}
      />
      <div className="grid grid-cols-4 gap-1">
        {COURSE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setPreset(preset.twa)}
            className={`min-h-11 ${
              compact ? 'px-0.5 py-0.5 text-[8px]' : 'px-1 py-1 text-[9px]'
            } rounded-md border font-semibold uppercase tracking-wider transition truncate`}
            style={{
              borderColor:
                Math.abs(ui.twa - preset.twa) < 2
                  ? 'var(--accent-cyan)'
                  : 'rgba(139, 167, 184, 0.22)',
              background:
                Math.abs(ui.twa - preset.twa) < 2 ? 'rgba(0, 212, 255, 0.12)' : 'transparent',
              color:
                Math.abs(ui.twa - preset.twa) < 2 ? 'var(--accent-cyan)' : 'var(--text-muted)',
            }}
          >
            {preset.id === 'close'
              ? tp('Бей', 'Close', 'Bajd.', { es: 'Ceñida', fr: 'Près', de: 'Am Wind', it: 'Bolina' })
              : preset.id === 'beam'
              ? tp('Галф', 'Beam', 'Półw.', { es: 'Través', fr: 'Travers', de: 'Halbwind', it: 'Traverso' })
              : preset.id === 'broad'
              ? tp('Бак', 'Broad', 'Baks.', { es: 'Largo', fr: 'Largue', de: 'Raumwind', it: 'Lasco' })
              : tp('Форд', 'Run', 'Ford.', { es: 'Empopada', fr: 'Arrière', de: 'Vorwind', it: 'Poppa' })}
          </button>
        ))}
      </div>
        </div>
      </details>
      <div className={`grid ${ui.mainTrim ? "grid-cols-1" : "grid-cols-2"} gap-1`}>
        {!ui.mainTrim && <button
          onClick={applyOptimal}
          disabled={Boolean(ui.mainTrim)}
          className={`${compact ? 'px-1 py-0.5 text-[9px]' : 'px-2 py-2 text-xs min-h-11'} rounded-md border font-semibold uppercase tracking-wider transition`}
          style={{ borderColor: 'rgba(82, 255, 142, 0.4)', color: 'var(--success)' }}
        >
          {tp('Оптим', 'Best', 'Optimum', { es: 'Óptimo', fr: 'Optimal', de: 'Optimal', it: 'Ottimo' })}
        </button>}
        <button
          onClick={resetAll}
          className={`${compact ? 'px-1 py-0.5 text-[9px]' : 'px-2 py-2 text-xs min-h-11'} rounded-md border font-semibold uppercase tracking-wider transition`}
          style={{ borderColor: 'rgba(139, 167, 184, 0.22)', color: 'var(--text-muted)' }}
        >
          {ui.mainTrim ? tp("Новая простая сессия", "New simple session", "Nowa prosta sesja", { es: "Nueva sesión simple", fr: "Nouvelle session simple", de: "Neue einfache Sitzung", it: "Nuova sessione semplice" }) : tp('Сброс', 'Reset', 'Reset', { es: 'Reiniciar', fr: 'Remise à zéro', de: 'Zurücksetzen', it: 'Azzera' })}
        </button>
      </div>
      {ui.view === "top" && !ui.mainTrim && <label
        className={`flex items-center gap-2 ${compact ? 'text-[9px]' : 'text-[10px]'} text-[var(--text-secondary)] cursor-pointer`}
      >
        <input
          type="checkbox"
          checked={ui.showOptimal}
          disabled={Boolean(ui.mainTrim)}
          onChange={(e) => setUi((p) => ({ ...p, showOptimal: e.target.checked }))}
        />
        {tp('Призрак оптимума', 'Ghost optimum', 'Duch optimum', {
          es: 'Fantasma del óptimo',
          fr: "Fantôme de l'optimum",
          de: 'Optimum-Geist',
          it: "Fantasma dell'ottimo",
        })}
      </label>}
      {props.children}
      </>}
    </PodCard>
  );
}
