'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/i18n';
import { useSimulatorV2 } from '@/features/simulator-v2/hooks/use-simulator-v2';
import { type UiState } from '@/features/simulator-v2/runtime/create-runtime-state';

// ============================================================================
// SIMULATOR V2 - eSail-style 3D race view.
//
// Live runtime (PR-2): the page holds the UI intent, the hook owns the
// persistent boat state and runs the fixed-step loop. Scene props are
// read from the runtime snapshot so a tack is a real turn, a trim change
// builds speed over time, and a wind-speed bump has immediate effect.
// ============================================================================

const SailingScene = dynamic(() => import('./SailingScene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center"
         style={{ background: 'radial-gradient(ellipse at center, #0c2745 0%, #040a16 100%)', color: '#00d4ff' }}>
      <div className="text-sm tracking-wider uppercase font-bold">Loading 3D scene...</div>
    </div>
  ),
});

const DEFAULT_UI: UiState = {
  twa: 90,
  tack: 'starboard',
  windSpeed: 12,
  mainOn: true,
  jibOn: true,
  reefLevel: 0,
  autoRotate: false,
};

const REEF_SCENE_VALUES: Record<0 | 1 | 2, number> = { 0: 0, 1: 0.45, 2: 0.85 };

export default function SimulatorV2Page() {
  const { tp } = useI18n();
  const [ui, setUi] = useState<UiState>(DEFAULT_UI);
  const { sim } = useSimulatorV2(ui);

  const heelAbs = Math.abs(sim.heel);

  return (
    <div className="page-enter relative" style={{ background: '#0b1e38', minHeight: 'calc(100vh - 56px)' }}>
      {/* Full-viewport 3D scene */}
      <div className="fixed inset-0 top-14" style={{ zIndex: 1 }}>
        <SailingScene
          twaSigned={sim.signedTwa}
          windSpeed={ui.windSpeed}
          boatSpeed={sim.boatSpeed}
          heel={sim.heel}
          mainAngle={sim.mainAngle}
          jibAngle={sim.jibAngle}
          mainOn={ui.mainOn}
          jibOn={ui.jibOn}
          reef={REEF_SCENE_VALUES[ui.reefLevel]}
          autoRotate={ui.autoRotate}
        />
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-5 py-2 border-b"
           style={{ background: 'rgba(5, 11, 24, 0.85)', borderColor: 'rgba(0, 212, 255, 0.18)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0"
                style={{ background: 'rgba(255, 170, 0, 0.15)', color: 'var(--warning)', border: '1px solid rgba(255, 170, 0, 0.38)' }}>
            V2 · eSail 3D
          </span>
          <span className="hidden sm:inline text-xs text-[var(--text-muted)] truncate">
            {tp('Live runtime. Поворот и трим строятся во времени.', 'Live runtime. Turns and trim settle over time.', 'Live runtime.')}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a href="/simulator" className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
             style={{ borderColor: 'rgba(139, 167, 184, 0.25)', color: 'var(--text-secondary)' }}>V1</a>
          <a href="/simulator-v3" className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
             style={{ borderColor: 'rgba(82, 255, 142, 0.4)', color: 'var(--success)' }}>V3</a>
        </div>
      </div>

      {/* HUD overlays and controls */}
      <div className="relative" style={{ zIndex: 10, pointerEvents: 'none' }}>
        {/* HUD: speed + heel in top-left */}
        <div className="absolute top-3 left-3 sm:top-5 sm:left-5">
          <div className="rounded-xl p-3 sm:p-4 space-y-3"
               style={{ background: 'rgba(5, 11, 24, 0.65)', border: '1px solid rgba(0, 212, 255, 0.22)', backdropFilter: 'blur(12px)', pointerEvents: 'auto' }}>
            <HudNumber label={tp('СКОРОСТЬ', 'SPEED', 'PREDKOSC')} value={sim.boatSpeed.toFixed(1)} unit="kts" big color="var(--accent-cyan)" />
            <HudNumber label={tp('КРЕН', 'HEEL', 'PRZECHYL')} value={Math.round(heelAbs).toString()} unit="°"
                       color={heelAbs > 28 ? 'var(--danger)' : heelAbs > 22 ? 'var(--warning)' : 'var(--accent-cyan)'} />
            <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: 'rgba(0, 212, 255, 0.12)' }}>
              <HudNumber label="AWA" value={Math.round(sim.awa).toString()} unit="°" small color="var(--accent-cyan)" />
              <HudNumber label="AWS" value={sim.aws.toFixed(1)} unit="kts" small color="var(--accent-cyan)" />
            </div>
            {sim.noGo && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--danger)]">
                {tp('мёртвая зона', 'no-go zone', 'strefa martwa')}
              </div>
            )}
          </div>
        </div>

        {/* Bottom control strip */}
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4"
             style={{ pointerEvents: 'none', zIndex: 15 }}>
          <div className="max-w-3xl mx-auto rounded-2xl p-3 sm:p-4 space-y-3"
               style={{ background: 'rgba(5, 11, 24, 0.85)', border: '1px solid rgba(0, 212, 255, 0.22)', backdropFilter: 'blur(14px)', pointerEvents: 'auto' }}>
            {/* Course slider (the intent - boat rotates toward it) */}
            <SliderRow label={tp('Курс к ветру', 'Angle to wind', 'Kat do wiatru')}
                       value={`${ui.twa}°`}
                       min={0} max={180} step={1}
                       sliderValue={ui.twa}
                       onChange={(v) => setUi((p) => ({ ...p, twa: v }))} />
            {/* Wind slider */}
            <SliderRow label={tp('Сила ветра', 'Wind speed', 'Sila wiatru')}
                       value={`${ui.windSpeed} kts`}
                       min={4} max={25} step={1}
                       sliderValue={ui.windSpeed}
                       onChange={(v) => setUi((p) => ({ ...p, windSpeed: v }))} />
            {/* Sail toggles + tack + reef */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <TogglePill
                label={tp('Грот', 'Main', 'Grot')}
                on={ui.mainOn}
                onClick={() => setUi((p) => ({ ...p, mainOn: !p.mainOn }))} />
              <TogglePill
                label={tp('Стаксель', 'Jib', 'Fok')}
                on={ui.jibOn}
                onClick={() => setUi((p) => ({ ...p, jibOn: !p.jibOn }))} />
              <TogglePill
                label={ui.tack === 'starboard' ? tp('Пр. галс', 'Stbd', 'Pr. hals') : tp('Лев. галс', 'Port', 'Lew. hals')}
                on={ui.tack === 'starboard'}
                onClick={() => setUi((p) => ({ ...p, tack: p.tack === 'starboard' ? 'port' : 'starboard' }))} />
              <TogglePill
                label={ui.reefLevel === 0 ? tp('Риф 0', 'Reef 0', 'Ref 0') : ui.reefLevel === 1 ? tp('Риф 1', 'Reef 1', 'Ref 1') : tp('Риф 2', 'Reef 2', 'Ref 2')}
                on={ui.reefLevel > 0}
                onClick={() => setUi((p) => ({ ...p, reefLevel: ((p.reefLevel + 1) % 3) as 0 | 1 | 2 }))} />
            </div>
            <label className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={ui.autoRotate}
                     onChange={(e) => setUi((p) => ({ ...p, autoRotate: e.target.checked }))} />
              {tp('Автоповорот камеры', 'Auto-rotate camera', 'Auto-obrot kamery')}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HUD helpers
// ---------------------------------------------------------------------------

function HudNumber({ label, value, unit, big, small, color }: {
  label: string; value: string; unit: string; big?: boolean; small?: boolean; color: string;
}) {
  const valSize = big ? 'text-3xl sm:text-4xl' : small ? 'text-base' : 'text-xl sm:text-2xl';
  const unitSize = big ? 'text-sm' : small ? 'text-[10px]' : 'text-xs';
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={`${valSize} font-black font-mono tabular-nums leading-none`} style={{ color }}>{value}</span>
        <span className={`${unitSize} text-[var(--text-muted)] font-semibold`}>{unit}</span>
      </div>
    </div>
  );
}

function SliderRow(props: {
  label: string; value: string; min: number; max: number; step: number; sliderValue: number; onChange: (v: number) => void;
}) {
  const { label, value, min, max, step, sliderValue, onChange } = props;
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">{label}</span>
        <span className="text-xs font-mono font-bold tabular-nums text-[var(--accent-cyan)]">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={sliderValue}
             onChange={(e) => onChange(Number(e.target.value))}
             className="w-full" style={{ accentColor: '#00d4ff' }} />
    </label>
  );
}

function TogglePill({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
            className="px-2 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition"
            style={{
              borderColor: on ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.25)',
              background: on ? 'rgba(0, 212, 255, 0.14)' : 'transparent',
              color: on ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            }}>
      {label}
    </button>
  );
}
