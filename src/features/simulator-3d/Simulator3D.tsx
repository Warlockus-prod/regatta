'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RegattaScene } from './RegattaScene';
import { useSailingSim } from './physics/useSailingSim';
import type { CoachKey } from './physics/sailModel';
import { WindDial } from './ui/WindDial';
import { useSailAudio } from './audio/useSailAudio';
import { DEFAULT_LABELS, NEUTRAL_YACHT, type SimLabels, type YachtState } from './types';

// Coach-state color (green = good, amber = warning, red = stop).
const COACH_TONE: Record<CoachKey, string> = {
  inIrons: '#e5484d',
  luffEaseIn: '#f5a524',
  stallEaseOut: '#e5484d',
  pinching: '#f5a524',
  good: '#46a758',
  reachOn: '#00d4ff',
  run: '#00d4ff',
};

// ============================================================================
// Simulator3D - the standalone V2 simulator.
//
// Depends only on react + three + @react-three/fiber + @react-three/drei.
// No Next.js and no app i18n: UI strings come from the `labels` prop (English
// defaults built in) and any app chrome (e.g. a version switcher) is passed via
// `headerSlot`. This makes the whole src/features/simulator-3d folder portable:
// zip it with the GLB and drop it into any React app.
//
// Two modes:
//  - free: sliders set the rig directly (inspect every trim / point of sail).
//  - sail: the physics model sails the boat; you steer and sheet, with live
//    telemetry and a trim coach.
// ============================================================================

type Mode = 'free' | 'sail';

const FREE_PRESETS: { key: keyof SimLabels['presets']; state: Partial<YachtState> }[] = [
  { key: 'luff', state: { boomAngle: 4, jibAngle: 4, camber: 0.0, twist: 0.3, luff: 1, heel: 2 } },
  { key: 'close', state: { boomAngle: 10, jibAngle: 8, camber: 0.3, twist: 0.35, luff: 0, heel: 22 } },
  { key: 'beam', state: { boomAngle: 45, jibAngle: 32, camber: 0.7, twist: 0.55, luff: 0, heel: 18 } },
  { key: 'broad', state: { boomAngle: 65, jibAngle: 48, camber: 0.85, twist: 0.7, luff: 0, heel: 12 } },
  { key: 'run', state: { boomAngle: 85, jibAngle: 70, camber: 0.9, twist: 0.9, luff: 0, heel: 5 } },
];

const FREE_DEFAULT: YachtState = { ...NEUTRAL_YACHT, boomAngle: 20, jibAngle: 15, camber: 0.5, twist: 0.42, heel: 16 };

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  const { label, value, min, max, step = 0.01, onChange, fmt } = props;
  return (
    <label className="block">
      <span className="flex justify-between text-xs text-[var(--text-secondary,#9fb6c4)]">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--accent-cyan,#00d4ff)]">{fmt ? fmt(value) : value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent-cyan,#00d4ff)]"
      />
    </label>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[rgba(255,255,255,0.04)] px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-secondary,#9fb6c4)]">{label}</div>
      <div className="tabular-nums text-sm font-semibold text-[var(--accent-cyan,#00d4ff)]">{value}</div>
    </div>
  );
}

function ModeBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-md px-3 py-1 text-sm font-semibold transition ' +
        (active
          ? 'bg-[var(--accent-cyan,#00d4ff)] text-[#04222d]'
          : 'border border-[rgba(255,255,255,0.12)] text-[var(--text-secondary,#9fb6c4)] hover:border-[rgba(0,212,255,0.4)]')
      }
    >
      {label}
    </button>
  );
}

export interface Simulator3DProps {
  labels?: Partial<SimLabels>;
  headerSlot?: ReactNode;
  className?: string;
  initialMode?: Mode;
  /**
   * Compact chromeless layout for the iOS app WebView: everything fits in
   * 100dvh and the control panel scrolls internally (the WKWebView disables
   * page scrolling, so nothing may live below the fold).
   */
  embed?: boolean;
}

export function Simulator3D({ labels, headerSlot, className, initialMode = 'free', embed = false }: Simulator3DProps) {
  const L: SimLabels = useMemo(
    () => ({
      ...DEFAULT_LABELS,
      ...labels,
      presets: { ...DEFAULT_LABELS.presets, ...(labels?.presets ?? {}) },
      coach: { ...DEFAULT_LABELS.coach, ...(labels?.coach ?? {}) },
    }),
    [labels],
  );

  const [mode, setMode] = useState<Mode>(initialMode);
  const yachtRef = useRef<YachtState>({ ...FREE_DEFAULT });

  const [free, setFree] = useState<YachtState>({ ...FREE_DEFAULT });
  useEffect(() => {
    if (mode === 'free') Object.assign(yachtRef.current, free);
  }, [free, mode]);
  const setFreeField = (patch: Partial<YachtState>) => setFree((s) => ({ ...s, ...patch }));

  const sim = useSailingSim(yachtRef, mode === 'sail');
  const t = sim.telemetry;
  const resetSim = sim.reset;
  const twsKn = sim.wind.twsKn;

  const audio = useSailAudio();
  const { enabled: audioEnabled, toggle: audioToggle, update: audioUpdate } = audio;

  // Reseed the boat to a clean start whenever we enter sailing mode, so it does
  // not jump from a stale position left over from a previous run.
  useEffect(() => {
    if (mode === 'sail') resetSim();
  }, [mode, resetSim]);

  // Drive the procedural audio from telemetry (~8 Hz) while sailing.
  useEffect(() => {
    if (mode !== 'sail' || !audioEnabled) return;
    const luffing = t.coach === 'luffEaseIn' || t.coach === 'inIrons';
    audioUpdate(t.awsKn, twsKn, t.speedKn, luffing, performance.now() / 1000);
  }, [mode, audioEnabled, audioUpdate, twsKn, t.awsKn, t.speedKn, t.coach]);

  return (
    <div
      className={
        (embed
          ? 'flex h-[100dvh] flex-col overflow-hidden px-2 py-2 '
          : 'mx-auto max-w-6xl px-4 py-4 ') + (className ?? '')
      }
    >
      <div className={(embed ? 'mb-2' : 'mb-3') + ' flex flex-wrap items-center justify-between gap-3'}>
        <div className="flex items-center gap-2">
          {!embed && (
            <span className="rounded-full border border-[rgba(0,212,255,0.35)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-cyan,#00d4ff)]">
              {L.badge}
            </span>
          )}
          <ModeBtn active={mode === 'free'} label={L.modeFree} onClick={() => setMode('free')} />
          <ModeBtn active={mode === 'sail'} label={L.modeSail} onClick={() => setMode('sail')} />
        </div>
        {headerSlot}
      </div>

      <div className={embed ? 'flex min-h-0 flex-1 flex-col gap-2' : 'grid gap-4 lg:grid-cols-[1fr_320px]'}>
        <div
          className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)]"
          style={embed ? { flex: '1 1 0%', minHeight: 0 } : { height: '68vh', minHeight: 420 }}
        >
          <RegattaScene stateRef={yachtRef} maxDpr={embed ? 1.5 : 2} postFx={!embed && typeof window !== 'undefined' && window.innerWidth >= 1024} />
          <div className="pointer-events-none absolute bottom-2 left-3 text-xs text-[rgba(255,255,255,0.55)]">{L.orbitHint}</div>

          {mode === 'sail' && (
            <>
              <button
                onClick={audioToggle}
                aria-label={L.sound}
                className="absolute left-3 top-3 rounded-md border border-[rgba(255,255,255,0.15)] bg-[rgba(4,22,30,0.7)] px-2 py-1 text-xs text-[var(--text-secondary,#9fb6c4)] hover:border-[rgba(0,212,255,0.4)]"
              >
                {audioEnabled ? '\u{1F50A}' : '\u{1F507}'} {L.sound}
              </button>
              <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
                <WindDial twaSigned={t.twaSigned} awaSigned={t.awaSigned} />
                <div className="grid grid-cols-2 gap-1.5">
                  <Readout label={L.speed} value={`${t.speedKn.toFixed(1)} kts`} />
                  <Readout label={L.heel} value={`${t.heelDeg.toFixed(0)}°`} />
                  <Readout label="VMG" value={`${t.vmg.toFixed(1)} kts`} />
                  <Readout label="TGT" value={`${t.targetSpeedKn.toFixed(1)} kts`} />
                </div>
                <div className="rounded bg-[rgba(4,22,30,0.7)] px-2 py-0.5 text-[10px] text-[var(--text-secondary,#9fb6c4)]">
                  {L.bestVmg}: {t.vmgTargetAngle.toFixed(0)}°
                </div>
              </div>
              <div
                className="absolute bottom-2 right-3 max-w-[60%] rounded-md px-3 py-1.5 text-right text-xs font-medium"
                style={{ background: 'rgba(4,22,30,0.82)', color: COACH_TONE[t.coach], borderLeft: `3px solid ${COACH_TONE[t.coach]}` }}
              >
                {L.coach[t.coach]}
              </div>
            </>
          )}
        </div>

        <div
          className={
            'space-y-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] ' +
            (embed ? 'max-h-[44dvh] overflow-y-auto p-3' : 'p-4')
          }
        >
          {mode === 'free' ? (
            <>
              <div className="rounded-md border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.06)] px-2.5 py-2 text-xs leading-relaxed text-[var(--text-secondary,#9fb6c4)]">
                {L.freeModeHint}
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary,#9fb6c4)]">{L.pointOfSail}</div>
                <div className="flex flex-wrap gap-1.5">
                  {FREE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setFree({ ...FREE_DEFAULT, reef: 0, ...p.state })}
                      className="rounded-md border border-[rgba(0,212,255,0.25)] px-2.5 py-1 text-xs text-[var(--text-primary,#e7f1f7)] hover:bg-[rgba(0,212,255,0.12)]"
                    >
                      {L.presets[p.key]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Slider label={L.mainsheet} value={free.boomAngle} min={0} max={85} step={1} onChange={(v) => setFreeField({ boomAngle: v })} fmt={(v) => `${v.toFixed(0)}°`} />
                <Slider label={L.jibsheet} value={free.jibAngle} min={0} max={70} step={1} onChange={(v) => setFreeField({ jibAngle: v })} fmt={(v) => `${v.toFixed(0)}°`} />
                <Slider label={L.camber} value={free.camber} min={0} max={1} onChange={(v) => setFreeField({ camber: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                <Slider label={L.twist} value={free.twist} min={0} max={1} onChange={(v) => setFreeField({ twist: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                <Slider label={L.luffing} value={free.luff} min={0} max={1} onChange={(v) => setFreeField({ luff: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                <Slider label={L.reef} value={free.reef} min={0} max={1} onChange={(v) => setFreeField({ reef: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                <Slider label={L.rudder} value={free.rudderAngle} min={-35} max={35} step={1} onChange={(v) => setFreeField({ rudderAngle: v })} fmt={(v) => `${v.toFixed(0)}°`} />
                <Slider label={L.heel} value={free.heel} min={0} max={35} step={1} onChange={(v) => setFreeField({ heel: v })} fmt={(v) => `${v.toFixed(0)}°`} />
              </div>
              <button onClick={() => setFree({ ...FREE_DEFAULT })} className="w-full rounded-md border border-[rgba(255,255,255,0.15)] py-1.5 text-sm text-[var(--text-secondary,#9fb6c4)] hover:border-[rgba(0,212,255,0.4)]">
                {L.reset}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <Slider label={L.helm} value={sim.controls.rudder} min={-1} max={1} onChange={(v) => sim.setControl('rudder', v)} fmt={(v) => (v === 0 ? '0' : `${(v * 35).toFixed(0)}°`)} />
                <div className="flex gap-1.5">
                  <button onClick={() => sim.setControl('rudder', 0)} className="flex-1 rounded-md border border-[rgba(255,255,255,0.15)] py-1 text-xs text-[var(--text-secondary,#9fb6c4)] hover:border-[rgba(0,212,255,0.4)]">
                    {L.helm} 0
                  </button>
                </div>
                <Slider label={L.mainsheet} value={sim.controls.mainSheet} min={0} max={1} onChange={(v) => sim.setControl('mainSheet', v)} fmt={(v) => `${Math.round(v * 100)}%`} />
                <Slider label={L.jibsheet} value={sim.controls.jibSheet} min={0} max={1} onChange={(v) => sim.setControl('jibSheet', v)} fmt={(v) => `${Math.round(v * 100)}%`} />
                <Slider label={L.reef} value={sim.controls.reef} min={0} max={1} onChange={(v) => sim.setControl('reef', v)} fmt={(v) => `${Math.round(v * 100)}%`} />
                <hr className="border-[rgba(255,255,255,0.08)]" />
                <Slider label={L.windSpeed} value={sim.wind.twsKn} min={4} max={28} step={1} onChange={(v) => sim.setWind((w) => ({ ...w, twsKn: v }))} fmt={(v) => `${v.toFixed(0)} kts`} />
                <Slider label={L.wind} value={sim.wind.fromDeg} min={0} max={359} step={1} onChange={(v) => sim.setWind((w) => ({ ...w, fromDeg: v }))} fmt={(v) => `${v.toFixed(0)}°`} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <Readout label="HDG" value={`${t.heading.toFixed(0)}`} />
                <Readout label={L.speed} value={`${t.speedKn.toFixed(1)}`} />
                <Readout label="AWS" value={`${t.awsKn.toFixed(0)}`} />
              </div>
              <button onClick={sim.reset} className="w-full rounded-md border border-[rgba(255,255,255,0.15)] py-1.5 text-sm text-[var(--text-secondary,#9fb6c4)] hover:border-[rgba(0,212,255,0.4)]">
                {L.reset}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Simulator3D;
