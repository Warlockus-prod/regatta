'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pointsOfSail, type PointOfSail } from '@/data/sailing-data';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const NO_GO_HALF = 30;        // ±30° around wind direction = no-go zone
const MAX_SPEED_KTS = 7.5;
const MAX_HEEL_DEG = 25;      // how far the boat leans at full force

const COLORS = {
  bg: '#0a1628',
  card: '#152540',
  cyan: '#00d4ff',
  text: '#e8f4f8',
  subtle: '#8ba7b8',
  muted: '#5a7a8a',
  danger: '#ff4444',
  water: '#0b1e38',
  waterDark: '#081830',
  hull: '#e8f0f6',
  hullDark: '#8fa8bd',
  sail: '#f6fbff',
  wind: '#00e5ff',
};

const d2r = (d: number) => (d * Math.PI) / 180;
const norm = (a: number) => ((a % 360) + 360) % 360;
const clamp = (v: number, mn: number, mx: number) => Math.max(mn, Math.min(mx, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Angle between boat heading and the wind source, 0..180 degrees. */
function twaAbs(boatHeading: number, windDir: number): number {
  let d = Math.abs(norm(boatHeading) - norm(windDir));
  if (d > 180) d = 360 - d;
  return d;
}

/** Signed TWA: positive = wind from boat's right (starboard tack), negative = port tack. */
function twaSigned(boatHeading: number, windDir: number): number {
  let d = norm(boatHeading - windDir);
  if (d > 180) d -= 360;
  return d;
}

function pointOfSailFor(wa: number): PointOfSail {
  for (const p of pointsOfSail) {
    if (wa >= p.angleMin && wa < p.angleMax) return p;
  }
  return pointsOfSail[pointsOfSail.length - 1];
}

function tackSide(boatHeading: number, windDir: number): 'port' | 'starboard' {
  const s = twaSigned(boatHeading, windDir);
  if (s === 0 || s === 180 || s === -180) return 'starboard';
  return s > 0 ? 'starboard' : 'port';
}

/** Heel (leewards lean) - depends on sail force × sin(TWA).
 * No heel in no-go zone (no force) or directly downwind. Max at beam reach. */
function heelDeg(wa: number, speedFactor: number): number {
  if (wa < NO_GO_HALF) return 0;
  // Heel peaks around 70-90° TWA then drops
  const force = speedFactor;
  const leverFactor = Math.sin(d2r(wa));
  return MAX_HEEL_DEG * force * leverFactor;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SimulatorPage() {
  // World state
  const [boatHeading, setBoatHeading] = useState(90);    // 0 = north, 90 = east
  const [windDir, setWindDir] = useState(0);             // wind comes FROM this direction (0 = from north)

  // Smoothed values for display (lerped each frame)
  const displayHeading = useRef(boatHeading);
  const displaySpeed = useRef(0);
  const displayHeel = useRef(0);

  // Canvases
  const topCanvasRef = useRef<HTMLCanvasElement>(null);
  const sideCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  // Interaction refs
  const dragModeRef = useRef<'boat' | 'wind' | null>(null);

  // Derived values
  const wa = twaAbs(boatHeading, windDir);
  const pos = pointOfSailFor(wa);
  const tack = tackSide(boatHeading, windDir);
  const speed = pos.speedFactor * MAX_SPEED_KTS;
  const heel = heelDeg(wa, pos.speedFactor);

  // --------------------------------------------------------------------------
  // Input: keyboard
  // --------------------------------------------------------------------------
  useEffect(() => {
    const keys = new Set<string>();
    const step = (e: KeyboardEvent) => {
      if (['arrowleft', 'a'].includes(e.key.toLowerCase())) {
        setBoatHeading((h) => norm(h - 3));
        e.preventDefault();
      } else if (['arrowright', 'd'].includes(e.key.toLowerCase())) {
        setBoatHeading((h) => norm(h + 3));
        e.preventDefault();
      } else if (['arrowup', 'w'].includes(e.key.toLowerCase())) {
        setWindDir((w) => norm(w - 5));
        e.preventDefault();
      } else if (['arrowdown', 's'].includes(e.key.toLowerCase())) {
        setWindDir((w) => norm(w + 5));
        e.preventDefault();
      }
      keys.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', step);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', step);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Canvas sizing (DPR-aware)
  // --------------------------------------------------------------------------
  const resizeCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    const onResize = () => {
      resizeCanvas(topCanvasRef.current);
      resizeCanvas(sideCanvasRef.current);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [resizeCanvas]);

  // --------------------------------------------------------------------------
  // Pointer interaction on top canvas
  // --------------------------------------------------------------------------
  const onTopPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = topCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const px = e.clientX - rect.left - cx;
    const py = e.clientY - rect.top - cy;
    const r = Math.hypot(px, py);
    const maxR = Math.min(rect.width, rect.height) / 2;
    // Outer ring → drag wind; inner area → drag boat
    dragModeRef.current = r > maxR * 0.78 ? 'wind' : 'boat';
  }, []);

  const onTopPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragModeRef.current) return;
    const canvas = topCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const px = e.clientX - rect.left - cx;
    const py = e.clientY - rect.top - cy;
    // Screen: y is down-positive; heading 0 is up, so atan2(x, -y) converts correctly
    const angle = norm(Math.atan2(px, -py) * (180 / Math.PI));
    if (dragModeRef.current === 'boat') {
      setBoatHeading(angle);
    } else {
      // Wind is coming FROM the pointer direction, i.e. the angle we computed is where wind originates
      setWindDir(angle);
    }
  }, []);

  const onTopPointerUp = useCallback(() => {
    dragModeRef.current = null;
  }, []);

  // --------------------------------------------------------------------------
  // Animation loop - lerp display values for smooth visuals, then draw
  // --------------------------------------------------------------------------
  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-dt * 8);
      displayHeading.current = lerpAngle(displayHeading.current, boatHeading, k);
      displaySpeed.current = lerp(displaySpeed.current, speed, k);
      displayHeel.current = lerp(displayHeel.current, heel, k * 0.8);
      drawTop();
      drawSide();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boatHeading, windDir]);

  // --------------------------------------------------------------------------
  // Draw: top-down view
  // --------------------------------------------------------------------------
  const drawTop = useCallback(() => {
    const canvas = topCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) / 2 - 4;

    // --- Water background with subtle radial ---
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, COLORS.water);
    g.addColorStop(1, COLORS.waterDark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // --- Compass ring ---
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.setLineDash([3, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- Cardinal labels - placed OUTSIDE the ring so they never overlap with
    // the TWA arc, the no-go sector or the yacht (B2 fix).
    ctx.fillStyle = COLORS.muted;
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels = [['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const;
    labels.forEach(([t, deg]) => {
      const a = d2r(deg - 90);
      const x = cx + Math.cos(a) * (R + 14);
      const y = cy + Math.sin(a) * (R + 14);
      ctx.fillText(t, x, y);
    });

    // --- No-go zone sector - oriented to wind source ---
    const wDir = windDir;
    ctx.save();
    ctx.translate(cx, cy);
    // no-go sector fan from (wDir - NO_GO_HALF) to (wDir + NO_GO_HALF)
    const noGoGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.78);
    noGoGrad.addColorStop(0, 'rgba(255, 68, 68, 0.35)');
    noGoGrad.addColorStop(1, 'rgba(255, 68, 68, 0.08)');
    ctx.fillStyle = noGoGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // In canvas: 0° heading should point UP. Canvas angle 0 is to the right, so subtract 90°.
    const aStart = d2r(wDir - NO_GO_HALF - 90);
    const aEnd = d2r(wDir + NO_GO_HALF - 90);
    ctx.arc(0, 0, R * 0.78, aStart, aEnd);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Point-of-sail colored sectors on both sides (except no-go) ---
    ctx.save();
    ctx.translate(cx, cy);
    pointsOfSail.forEach((p) => {
      if (p.id === 'in-irons') return;
      [1, -1].forEach((side) => {
        const s = d2r(wDir + p.angleMin * side - 90);
        const e = d2r(wDir + p.angleMax * side - 90);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        if (side === 1) ctx.arc(0, 0, R * 0.78, s, e);
        else ctx.arc(0, 0, R * 0.78, s, e, true);
        ctx.closePath();
        ctx.fillStyle = p.color + '13'; // ~7% opacity
        ctx.fill();
      });
    });
    ctx.restore();

    // --- Wind direction arrow (from wDir, pointing away) ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(d2r(wDir));
    ctx.strokeStyle = COLORS.wind;
    ctx.fillStyle = COLORS.wind;
    ctx.lineWidth = 2;
    // Arrow on outside of ring pointing INWARD (wind comes from here)
    const arrowY0 = -(R - 6);
    const arrowY1 = -(R * 0.78 + 12);
    ctx.beginPath();
    ctx.moveTo(0, arrowY0);
    ctx.lineTo(0, arrowY1);
    ctx.stroke();
    // Arrowhead pointing toward center
    ctx.beginPath();
    ctx.moveTo(0, arrowY1);
    ctx.lineTo(-5, arrowY1 - 7);
    ctx.lineTo(5, arrowY1 - 7);
    ctx.closePath();
    ctx.fill();
    // Wind label - larger, bolder so it reads on mobile
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = COLORS.wind;
    ctx.textAlign = 'center';
    ctx.fillText('ВЕТЕР', 0, -(R + 16));
    ctx.font = '500 9px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.fillText('(источник)', 0, -(R + 4));
    ctx.restore();

    // --- Wind drag handle (visual hint on ring edge) ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(d2r(wDir));
    ctx.fillStyle = COLORS.wind;
    ctx.beginPath();
    ctx.arc(0, -(R - 2), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // --- Boat ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(d2r(displayHeading.current));
    drawBoatTop(ctx, pos, tack, heel);
    ctx.restore();

    // --- TWA arc from boat heading to wind source ---
    ctx.save();
    ctx.translate(cx, cy);
    const rArc = R * 0.5;
    ctx.strokeStyle = pos.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    const startA = d2r(displayHeading.current - 90);
    const endA = d2r(wDir - 90);
    // short arc between them
    const diff = twaSigned(displayHeading.current, wDir);
    ctx.beginPath();
    ctx.arc(0, 0, rArc, startA, endA, diff > 0);
    ctx.stroke();
    // TWA label at arc middle - with pill background so it's readable over
    // cardinal labels and sector overlays (B2 fix).
    const midA = (startA + endA) / 2 + (Math.abs(endA - startA) > Math.PI ? Math.PI : 0);
    const lx = Math.cos(midA) * (rArc + 18);
    const ly = Math.sin(midA) * (rArc + 18);
    const labelText = `${Math.round(wa)}°`;
    ctx.font = '600 12px system-ui, sans-serif';
    const tw = ctx.measureText(labelText).width;
    // Pill background
    ctx.fillStyle = 'rgba(10, 22, 40, 0.85)';
    ctx.strokeStyle = pos.color + '88';
    ctx.lineWidth = 1;
    const padX = 6;
    const pillW = tw + padX * 2;
    const pillH = 16;
    const rr = 8;
    ctx.beginPath();
    ctx.moveTo(lx - pillW / 2 + rr, ly - pillH / 2);
    ctx.lineTo(lx + pillW / 2 - rr, ly - pillH / 2);
    ctx.quadraticCurveTo(lx + pillW / 2, ly - pillH / 2, lx + pillW / 2, ly - pillH / 2 + rr);
    ctx.lineTo(lx + pillW / 2, ly + pillH / 2 - rr);
    ctx.quadraticCurveTo(lx + pillW / 2, ly + pillH / 2, lx + pillW / 2 - rr, ly + pillH / 2);
    ctx.lineTo(lx - pillW / 2 + rr, ly + pillH / 2);
    ctx.quadraticCurveTo(lx - pillW / 2, ly + pillH / 2, lx - pillW / 2, ly + pillH / 2 - rr);
    ctx.lineTo(lx - pillW / 2, ly - pillH / 2 + rr);
    ctx.quadraticCurveTo(lx - pillW / 2, ly - pillH / 2, lx - pillW / 2 + rr, ly - pillH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Label
    ctx.fillStyle = pos.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, lx, ly + 0.5);
    ctx.restore();

    // --- Hint text ---
    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Потяни яхту - повернёт. Потяни по кольцу - ветер.', cx, 14);
  }, [windDir, pos, wa, tack, heel]);

  // --------------------------------------------------------------------------
  // Draw: side view with heel
  // --------------------------------------------------------------------------
  const drawSide = useCallback(() => {
    const canvas = sideCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    // Water gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d2847');
    g.addColorStop(0.55, '#0b1e38');
    g.addColorStop(0.56, '#081830');
    g.addColorStop(1, '#051020');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Horizon line
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, H * 0.55);
    ctx.lineTo(W, H * 0.55);
    ctx.stroke();
    ctx.setLineDash([]);

    // Wave highlights on water
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const now = performance.now() / 1000;
    for (let i = 0; i < 6; i++) {
      const y = H * 0.55 + 8 + i * 14;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const yy = y + Math.sin((x + now * 40 + i * 20) * 0.04) * 1.5;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    // Wind arrow (from left, always - we assume this view is looking along wind direction)
    ctx.save();
    ctx.strokeStyle = COLORS.wind;
    ctx.fillStyle = COLORS.wind;
    ctx.lineWidth = 1.5;
    const wy = H * 0.2;
    for (let i = 0; i < 3; i++) {
      const dx = (now * 60 + i * 40) % 80;
      ctx.globalAlpha = 0.3 + (i / 3) * 0.4;
      ctx.beginPath();
      ctx.moveTo(10 + dx, wy + i * 12);
      ctx.lineTo(40 + dx, wy + i * 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(40 + dx, wy + i * 12);
      ctx.lineTo(36 + dx, wy + i * 12 - 3);
      ctx.lineTo(36 + dx, wy + i * 12 + 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Boat side view
    const bx = W / 2;
    const bySurface = H * 0.55;
    // Heel direction: if wind is from port (negative TWA), boat leans to starboard (right)
    const sTWA = twaSigned(boatHeading, windDir);
    const heelSign = sTWA > 0 ? 1 : -1; // wind from right (starboard tack = positive sTWA) → leans left
    // Actually: wind from starboard → sail on port → heel to port (left). So heelSign = -sign(sTWA)
    const appliedHeel = -heelSign * displayHeel.current;

    ctx.save();
    ctx.translate(bx, bySurface);
    ctx.rotate(d2r(appliedHeel));
    // Pass the wind/sail side so the mainsail billows LEEWARD (same side as heel)
    drawBoatSide(ctx, displaySpeed.current / MAX_SPEED_KTS, heelSign, Math.abs(sTWA));
    ctx.restore();

    // HUD-like strip with key status
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Скорость: ${displaySpeed.current.toFixed(1)} kts`, 10, H - 10);
    ctx.fillText(`Крен: ${Math.round(displayHeel.current)}°`, 10, H - 24);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText('← ВЕТЕР сюда', W - 10, H - 10);
    ctx.restore();

    // Heel explanation - when heel > 10°, show arrow + brief reason
    if (Math.abs(displayHeel.current) > 10) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 221, 68, 0.85)';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ветер давит в парус → яхта наклоняется', W / 2, 18);
      ctx.restore();
    }

    // Vertical reference line (shows true vertical vs mast tilt)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(bx, bySurface);
    ctx.lineTo(bx, bySurface - 80);
    ctx.stroke();
    ctx.restore();
  }, [boatHeading, windDir]);

  const reset = useCallback(() => {
    setBoatHeading(90);
    setWindDir(0);
  }, []);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  const heelDisplay = Math.round(displayHeel.current);
  const sailTrim = useMemo(() => pos.sailWork, [pos]);

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Симулятор</h1>
        <p className="text-sm text-[var(--text-secondary)]">Top view + side view с креном. Перетаскивай яхту и точку ветра.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-4 sm:gap-6">
        {/* Left column: canvases */}
        <div className="flex flex-col gap-4">
          {/* Top view canvas */}
          <div className="card p-2 sm:p-3">
            <canvas
              ref={topCanvasRef}
              onPointerDown={onTopPointerDown}
              onPointerMove={onTopPointerMove}
              onPointerUp={onTopPointerUp}
              onPointerCancel={onTopPointerUp}
              className="block w-full rounded-lg cursor-grab active:cursor-grabbing"
              style={{ aspectRatio: '1', touchAction: 'none', maxHeight: '70vh' }}
            />
          </div>

          {/* Side view canvas */}
          <div className="card p-2 sm:p-3">
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">ВИД СБОКУ / SIDE VIEW</div>
              <div className="text-xs font-mono" style={{ color: COLORS.cyan }}>крен {heelDisplay}°</div>
            </div>
            <canvas
              ref={sideCanvasRef}
              className="block w-full rounded-lg"
              style={{ aspectRatio: '2.2 / 1', maxHeight: '200px' }}
            />
          </div>
        </div>

        {/* Right column: info panel */}
        <div className="flex flex-col gap-3">
          {/* Current course */}
          <div className="card p-4" style={{ borderColor: pos.color + '40' }}>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-1">КУРС / POINT OF SAIL</div>
            <div className="text-2xl font-bold" style={{ color: pos.color }}>{pos.nameRu}</div>
            <div className="text-sm text-[var(--text-secondary)]">{pos.nameEn}</div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3">
              <div className="text-[10px] tracking-wider text-[var(--text-muted)] mb-1">УГОЛ К ВЕТРУ</div>
              <div className="text-2xl font-bold font-mono" style={{ color: COLORS.cyan }}>{Math.round(wa)}°</div>
            </div>
            <div className="card p-3">
              <div className="text-[10px] tracking-wider text-[var(--text-muted)] mb-1">ГАЛС</div>
              <div className="text-lg font-bold" style={{ color: tack === 'starboard' ? '#44ff88' : '#ff8844' }}>
                {tack === 'starboard' ? 'Правый' : 'Левый'}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">{tack === 'starboard' ? 'Starboard' : 'Port'}</div>
            </div>
          </div>

          {/* Speed bar */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-wider text-[var(--text-muted)]">СКОРОСТЬ / SPEED</div>
              <div className="text-sm font-bold font-mono" style={{ color: pos.color }}>{speed.toFixed(1)} kts</div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="h-full transition-all" style={{ width: `${(speed / MAX_SPEED_KTS) * 100}%`, background: `linear-gradient(90deg, ${pos.color}88, ${pos.color})` }} />
            </div>
          </div>

          {/* Heel bar */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-wider text-[var(--text-muted)]">КРЕН / HEEL</div>
              <div className="text-sm font-bold font-mono" style={{ color: heel > 18 ? COLORS.danger : COLORS.cyan }}>
                {heelDisplay}°
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="h-full transition-all" style={{
                width: `${Math.min(100, (Math.abs(heel) / MAX_HEEL_DEG) * 100)}%`,
                background: heel > 18 ? 'var(--danger)' : 'var(--accent-cyan)',
              }} />
            </div>
          </div>

          {/* Sail trim */}
          <div className="card p-3">
            <div className="text-[10px] tracking-wider text-[var(--text-muted)] mb-1">РАБОТА ПАРУСОВ</div>
            <div className="text-sm text-[var(--text-primary)]">{sailTrim}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{pos.sailWorkEn}</div>
          </div>

          {/* Wind direction control */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-wider text-[var(--text-muted)]">НАПРАВЛЕНИЕ ВЕТРА</div>
              <div className="text-sm font-mono" style={{ color: COLORS.wind }}>{Math.round(windDir)}°</div>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={windDir}
              onChange={(e) => setWindDir(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: COLORS.wind }}
              aria-label="Wind direction"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
              <span>N</span><span>E</span><span>S</span><span>W</span><span>N</span>
            </div>
          </div>

          {/* Boat heading control */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-wider text-[var(--text-muted)]">КУРС ЯХТЫ</div>
              <div className="text-sm font-mono" style={{ color: COLORS.cyan }}>{Math.round(boatHeading)}°</div>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={boatHeading}
              onChange={(e) => setBoatHeading(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: COLORS.cyan }}
              aria-label="Boat heading"
            />
          </div>

          <button
            onClick={reset}
            className="py-2 rounded-lg border text-sm transition hover:bg-[rgba(0,212,255,0.1)]"
            style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: COLORS.cyan }}
          >
            Сброс
          </button>

          <details className="card p-3">
            <summary className="cursor-pointer text-xs font-semibold tracking-wider text-[var(--text-muted)]">ОПИСАНИЕ / DESCRIPTION</summary>
            <p className="mt-2 text-sm text-[var(--text-primary)] leading-relaxed">{pos.description}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">{pos.descriptionEn}</p>
          </details>

          <details className="card p-3" open>
            <summary className="cursor-pointer text-xs font-semibold tracking-wider text-[var(--text-muted)]">ДВА ПАРУСА / TWO-SAIL PHYSICS</summary>
            <TwoSailPhysics twaAbsolute={wa} />
          </details>

          <details className="card p-3">
            <summary className="cursor-pointer text-xs font-semibold tracking-wider text-[var(--text-muted)]">ПОЛЯРА / POLAR DIAGRAM</summary>
            <PolarDiagram twaAbsolute={wa} />
          </details>
        </div>
      </div>

      {/* Sail Trim Trainer - inline below the view */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🎛</span>
          <h2 className="text-lg font-semibold">Тренажёр грота и стакселя</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed max-w-2xl">
          Двигай кнопками углы грота и стакселя. Смотри как меняется скорость, крен и trim efficiency. Ghost-контур показывает оптимальные углы для текущего курса.
        </p>
        <InlineTrimTrainer />
      </div>
    </div>
  );
}

// ============================================================================
// Polar diagram - speed vs TWA curve for a typical cruiser in medium wind
// ============================================================================

function PolarDiagram({ twaAbsolute }: { twaAbsolute: number }) {
  // Speed factor table keyed on TWA (0..180). Typical cruiser polar shape.
  // Numbers are relative boat-speed (0..1), tuned to match pointsOfSail in sailing-data.
  const polar: { twa: number; speed: number }[] = [];
  for (let t = 0; t <= 180; t += 5) {
    let s = 0;
    if (t < 30) s = 0;
    else if (t < 45) s = ((t - 30) / 15) * 0.65;
    else if (t < 90) s = 0.65 + ((t - 45) / 45) * 0.35;
    else if (t < 160) s = 1.0 - ((t - 90) / 70) * 0.15;
    else s = 0.85 - ((t - 160) / 20) * 0.25;
    polar.push({ twa: t, speed: Math.max(0, s) });
  }

  // Render on a half-disc (right side only because of symmetry).
  const SIZE = 180;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE * 0.45;

  const poly = polar
    .map(({ twa, speed }) => {
      const angle = (twa - 90) * Math.PI / 180; // 0° = wind up, 90° = right
      const r = speed * R;
      const x = CX + Math.cos(angle) * r;
      const y = CY + Math.sin(angle) * r;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Current position marker
  const currentSpeed = polar.find((p) => p.twa >= twaAbsolute)?.speed ?? 0;
  const cAngle = (twaAbsolute - 90) * Math.PI / 180;
  const cx = CX + Math.cos(cAngle) * currentSpeed * R;
  const cy = CY + Math.sin(cAngle) * currentSpeed * R;

  return (
    <div className="mt-2">
      <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
        Поляра - кривая скорости на разных углах к ветру для крузового слупа в среднем ветре. Показывает где яхта идёт быстрее всего.
      </div>
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} style={{ maxWidth: '100%' }}>
          {/* Concentric speed rings */}
          {[0.25, 0.5, 0.75, 1.0].map((f) => (
            <circle key={f} cx={CX} cy={CY} r={f * R} fill="none" stroke="rgba(139,167,184,0.2)" strokeWidth="0.5" strokeDasharray="2 3" />
          ))}
          {/* TWA radial lines at 30, 60, 90, 120, 150 */}
          {[30, 60, 90, 120, 150].map((t) => {
            const a = (t - 90) * Math.PI / 180;
            const x2 = CX + Math.cos(a) * R;
            const y2 = CY + Math.sin(a) * R;
            return (
              <g key={t}>
                <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="rgba(139,167,184,0.15)" strokeWidth="0.5" />
                <text x={CX + Math.cos(a) * (R + 8)} y={CY + Math.sin(a) * (R + 8) + 3}
                      fontSize="8" fill="#5a7a8a" textAnchor="middle">{t}°</text>
              </g>
            );
          })}
          {/* Wind arrow at top */}
          <line x1={CX} y1={CY - R - 14} x2={CX} y2={CY - R + 2} stroke="#00e5ff" strokeWidth="1.2" />
          <polygon points={`${CX - 3},${CY - R - 4} ${CX + 3},${CY - R - 4} ${CX},${CY - R + 2}`} fill="#00e5ff" />
          <text x={CX} y={CY - R - 18} fontSize="7.5" fill="#00e5ff" textAnchor="middle">ветер</text>
          {/* No-go sector */}
          <path
            d={`M ${CX} ${CY} L ${CX + Math.cos((-30 - 90) * Math.PI / 180) * R} ${CY + Math.sin((-30 - 90) * Math.PI / 180) * R}
                A ${R} ${R} 0 0 1 ${CX + Math.cos((30 - 90) * Math.PI / 180) * R} ${CY + Math.sin((30 - 90) * Math.PI / 180) * R} Z`}
            fill="rgba(255,68,68,0.08)" stroke="rgba(255,68,68,0.3)" strokeWidth="0.5" strokeDasharray="2 2" />
          {/* Polar curve (right half) */}
          <polyline points={poly} fill="rgba(0,212,255,0.1)" stroke="#00d4ff" strokeWidth="1.5" />
          {/* Mirror for the left side */}
          <polyline points={poly} fill="rgba(0,212,255,0.1)" stroke="#00d4ff" strokeWidth="1.5"
                    transform={`scale(-1,1) translate(${-SIZE},0)`} />
          {/* Current TWA marker */}
          <circle cx={cx} cy={cy} r="4" fill="#44ff88" stroke="#ffffff" strokeWidth="1.5" />
          {/* Center wind-source marker */}
          <circle cx={CX} cy={CY} r="1.5" fill="#8ba7b8" />
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#00d4ff' }} />поляра</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#44ff88' }} />ты сейчас</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(255,68,68,0.3)' }} />мёртвая зона</span>
      </div>
      <div className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
        <span className="font-semibold text-[var(--accent-cyan)]">Как читать:</span> чем дальше точка от центра, тем быстрее яхта на этом угле. Максимум около 90° (галфвинд). Около 150° (бакштаг) - тоже быстро. Фордевинд (180°) медленнее, потому что грот перекрывает стаксель.
      </div>
    </div>
  );
}

// ============================================================================
// Two-sail physics explainer - reacts to current TWA
// ============================================================================

function TwoSailPhysics({ twaAbsolute }: { twaAbsolute: number }) {
  const wa = twaAbsolute;
  let mode: 'no-go' | 'upwind' | 'beam' | 'broad' | 'downwind';
  if (wa < 30) mode = 'no-go';
  else if (wa < 60) mode = 'upwind';
  else if (wa < 110) mode = 'beam';
  else if (wa < 160) mode = 'broad';
  else mode = 'downwind';

  const blocks: Record<typeof mode, { title: string; main: string; jib: string; slot: string; tip: string }> = {
    'no-go': {
      title: 'Мёртвая зона - оба паруса полощут',
      main: 'Грот стоит вдоль ветра, не наполнен.',
      jib: 'Стаксель так же - флаг на ветру.',
      slot: 'Slot-эффекта нет, тяги нет, яхта не идёт.',
      tip: 'Увалить на 50° от ветра - паруса наполнятся, поедешь.',
    },
    upwind: {
      title: 'Бейдевинд - slot effect на максимум',
      main: 'Грот выбран туго, почти вдоль диаметральной.',
      jib: 'Стаксель выбран на 75% угла грота - образует узкую щель.',
      slot: 'Между ними ветер ускоряется (венту́ри) - подсос даёт гроту больше тяги. Это и есть slot effect.',
      tip: 'Стаксель закрыл грот в подветр = щель сузилась = грот заполаскивает. Трави стаксель.',
    },
    beam: {
      title: 'Галфвинд - максимальная скорость',
      main: 'Грот выходит под 30-45°.',
      jib: 'Стаксель тоже открыт, работает как крыло.',
      slot: 'Оба паруса дают тягу равномерно. Slot ещё эффективен.',
      tip: 'Самый быстрый курс. Крен максимальный - готовься.',
    },
    broad: {
      title: 'Бакштаг - паруса раскрыты',
      main: 'Грот почти упёрся в ванты, гик далеко выдвинут.',
      jib: 'Стаксель начинает прикрываться гротом (blanket effect).',
      slot: 'Slot уже не работает - паруса в «параллель», ловят ветер отдельно.',
      tip: 'Хороший курс для спинакера/геннакера - но их поднимают только опытные.',
    },
    downwind: {
      title: 'Фордевинд - стаксель сдувается',
      main: 'Грот полностью раскрыт, гик почти у воды.',
      jib: 'Стаксель в ветровой тени грота - полощет или опал.',
      slot: 'Эффекта нет. Два паруса = потеря одного.',
      tip: '«Крылья бабочки»: стаксель переносят на противоположный борт (wing-on-wing) - оба работают отдельно. Либо спинакер/геннакер.',
    },
  };

  const b = blocks[mode];
  return (
    <div className="mt-2 space-y-2">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{b.title}</div>
      <div className="grid grid-cols-1 gap-1.5 text-xs">
        <div className="flex gap-2">
          <span className="text-[var(--accent-cyan)] shrink-0 w-16 font-semibold">Грот:</span>
          <span className="text-[var(--text-secondary)]">{b.main}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[var(--accent-cyan)] shrink-0 w-16 font-semibold">Стаксель:</span>
          <span className="text-[var(--text-secondary)]">{b.jib}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[var(--success)] shrink-0 w-16 font-semibold">Slot:</span>
          <span className="text-[var(--text-secondary)]">{b.slot}</span>
        </div>
      </div>
      <div className="p-2 rounded text-[11px] leading-relaxed" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
        <span className="text-[var(--accent-cyan)] font-semibold">💡 </span>
        <span className="text-[var(--text-primary)]">{b.tip}</span>
      </div>
      <div className="text-[10px] text-[var(--text-muted)] leading-relaxed pt-1 border-t border-[rgba(139,167,184,0.15)]">
        <span className="font-semibold">Геннакер:</span> лёгкий асимметричный парус для фордевинда/бакштага. Поднимают вместо стакселя, когда ветер из-за спины. На симуляторе не показан - управление требует отдельной команды (trimmer). Эффект: удваивает скорость на попутных курсах.
      </div>
    </div>
  );
}

// ============================================================================
// DRAWING HELPERS
// ============================================================================

function drawBoatTop(ctx: CanvasRenderingContext2D, pos: PointOfSail, tack: 'port' | 'starboard', heel: number) {
  // Hull - elongated oval, bow pointing up (0° = north). Enlarged x1.5 for mobile legibility.
  const hullLen = 72;
  const hullBeam = 24;

  // Shadow
  ctx.save();
  ctx.translate(1, 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundedHull(ctx, hullBeam, hullLen);
  ctx.fill();
  ctx.restore();

  // Hull
  const grad = ctx.createLinearGradient(-hullBeam, 0, hullBeam, 0);
  grad.addColorStop(0, COLORS.hullDark);
  grad.addColorStop(0.5, COLORS.hull);
  grad.addColorStop(1, COLORS.hullDark);
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  roundedHull(ctx, hullBeam, hullLen);
  ctx.fill();
  ctx.stroke();

  // Cockpit
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, hullLen * 0.25, hullBeam * 0.45, hullLen * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mast dot
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(0, -hullLen * 0.15, 2, 0, Math.PI * 2);
  ctx.fill();

  // Sails - both go opposite side of wind.
  // Main (грот) pivots from mast and extends aft (toward cockpit).
  // Jib (стаксель) pivots from forestay (bow) and is trimmed tighter than main.
  const sailSide = tack === 'starboard' ? -1 : 1;  // wind from right → sails on left
  const mainAngle = (() => {
    if (pos.angleMin === 0) return 0;
    return pos.sailAngle;
  })();
  // Jib is sheeted in tighter: ~0.75x the main's angle on upwind, collapses more downwind
  const twaMag = (pos.angleMin + pos.angleMax) / 2;
  const jibFactor = twaMag < 120 ? 0.75 : 0.55; // jib loses drive going dead downwind (blanketed)
  const jibAngle = mainAngle * jibFactor;

  // Animated flutter if near no-go
  const flutter = twaMag < 35 ? Math.sin(performance.now() / 80) * 2 : 0;
  const jibFlutter = twaMag < 35 ? Math.sin(performance.now() / 80 + 1) * 2.5 : 0;
  // Jib is blanketed by main going dead downwind -> render semi-transparent
  const jibBlanketed = twaMag > 155;
  const inNoGo = pos.speedFactor < 0.05;

  // --- Jib (стаксель) - drawn FIRST so mainsail overlaps forward edge ---
  ctx.save();
  ctx.translate(0, -hullLen * 0.45); // forestay tack near bow
  ctx.rotate(d2r(jibAngle * sailSide + jibFlutter));
  ctx.fillStyle = inNoGo
    ? 'rgba(255, 255, 255, 0.2)'
    : jibBlanketed ? 'rgba(246, 251, 255, 0.4)' : 'rgba(246, 251, 255, 0.92)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0); // tack at forestay
  // Billow toward clew; jib foot is shorter than main foot
  ctx.quadraticCurveTo(sailSide * 7, hullLen * 0.14, sailSide * 3, hullLen * 0.28);
  ctx.lineTo(0, hullLen * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // --- Mainsail (грот) - drawn on top, pivots at mast ---
  ctx.save();
  ctx.rotate(d2r(mainAngle * sailSide + flutter));
  ctx.fillStyle = inNoGo ? 'rgba(255, 255, 255, 0.25)' : COLORS.sail;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -hullLen * 0.15);
  ctx.quadraticCurveTo(sailSide * 8, hullLen * 0.1, sailSide * 2, hullLen * 0.35);
  ctx.lineTo(0, hullLen * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // --- Sail labels (stay readable because the outer rotate puts them in natural orientation)
  if (!inNoGo) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    // Mainsail label near its belly
    ctx.save();
    ctx.rotate(d2r(mainAngle * sailSide));
    ctx.fillText('ГРОТ', sailSide * 5, hullLen * 0.22);
    ctx.restore();
    // Jib label near its belly
    ctx.save();
    ctx.translate(0, -hullLen * 0.45);
    ctx.rotate(d2r(jibAngle * sailSide));
    ctx.fillText('СТАКС.', sailSide * 4, hullLen * 0.18);
    ctx.restore();
    ctx.restore();
  }

  // --- Slot effect indicator: visible on close-hauled/beam reach when both sails drive ---
  if (!inNoGo && !jibBlanketed && twaMag >= 35 && twaMag <= 120) {
    ctx.save();
    const slotOpacity = Math.min(1, (twaMag - 30) / 40) * 0.4;
    ctx.strokeStyle = `rgba(0, 212, 255, ${slotOpacity})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    // Draw a curved arrow between jib clew and mainsail luff showing airflow slot
    ctx.beginPath();
    ctx.moveTo(sailSide * 3.5, -hullLen * 0.18);
    ctx.quadraticCurveTo(sailSide * 6, -hullLen * 0.05, sailSide * 4, hullLen * 0.08);
    ctx.stroke();
    ctx.setLineDash([]);
    // Small arrowhead
    ctx.fillStyle = `rgba(0, 212, 255, ${slotOpacity * 1.5})`;
    ctx.beginPath();
    ctx.moveTo(sailSide * 4, hullLen * 0.08);
    ctx.lineTo(sailSide * 5.5, hullLen * 0.04);
    ctx.lineTo(sailSide * 4.5, hullLen * 0.13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Heel indicator (small lean lines on sides)
  if (Math.abs(heel) > 5) {
    ctx.save();
    ctx.strokeStyle = COLORS.cyan + '66';
    ctx.lineWidth = 1;
    const heelSide = tack === 'starboard' ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(heelSide * hullBeam * 1.1, -hullLen * 0.3);
    ctx.lineTo(heelSide * hullBeam * 1.4, -hullLen * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(heelSide * hullBeam * 1.1, 0);
    ctx.lineTo(heelSide * hullBeam * 1.5, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBoatSide(ctx: CanvasRenderingContext2D, forceFactor: number, sailSide: number = 1, twaAbs: number = 90) {
  // Hull - side profile, waterline at y=0
  // sailSide: +1 = sail billows toward +X (right), -1 = toward -X (left). Matches heel direction.
  // twaAbs: 0..180. Drives sail angle from centerline and reef-like shape.
  const hullLen = 180;
  const hullHeight = 22;
  const drop = 10; // how much below waterline

  // Below-water part (keel / underbody)
  ctx.fillStyle = 'rgba(0, 30, 50, 0.6)';
  ctx.beginPath();
  ctx.moveTo(-hullLen / 2, 0);
  ctx.quadraticCurveTo(-hullLen / 2 + 12, drop + 6, -hullLen / 2 + 30, drop);
  ctx.lineTo(hullLen / 2 - 30, drop);
  ctx.quadraticCurveTo(hullLen / 2 - 10, drop + 4, hullLen / 2, 0);
  ctx.closePath();
  ctx.fill();

  // Keel fin
  ctx.fillStyle = 'rgba(0, 20, 35, 0.85)';
  ctx.beginPath();
  ctx.moveTo(-10, drop - 2);
  ctx.lineTo(10, drop - 2);
  ctx.lineTo(6, drop + 30);
  ctx.lineTo(-6, drop + 30);
  ctx.closePath();
  ctx.fill();

  // Hull above waterline
  const grad = ctx.createLinearGradient(0, -hullHeight, 0, 0);
  grad.addColorStop(0, COLORS.hull);
  grad.addColorStop(1, COLORS.hullDark);
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-hullLen / 2, 0);
  ctx.quadraticCurveTo(-hullLen / 2 - 4, -hullHeight * 0.6, -hullLen / 2 + 20, -hullHeight);
  ctx.lineTo(hullLen / 2 - 10, -hullHeight);
  ctx.quadraticCurveTo(hullLen / 2 + 2, -hullHeight * 0.3, hullLen / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Waterline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-hullLen / 2, 0);
  ctx.lineTo(hullLen / 2, 0);
  ctx.stroke();

  // Cabin / cockpit
  ctx.fillStyle = '#344a6a';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-20, -hullHeight);
  ctx.lineTo(-15, -hullHeight - 10);
  ctx.lineTo(15, -hullHeight - 10);
  ctx.lineTo(25, -hullHeight);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Mast centered in hull
  const mastX = 0;
  const mastTop = -hullHeight - 110;
  ctx.strokeStyle = '#d0d8e0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mastX, -hullHeight - 10);
  ctx.lineTo(mastX, mastTop);
  ctx.stroke();

  // Boom swings toward the LEE side (sailSide); its length shows boom angle.
  // Close-hauled -> boom almost centered (short horizontal extent).
  // Broad reach / running -> boom fully out.
  const boomExtent = Math.min(1, Math.max(0.2, twaAbs / 120)) * 60;
  ctx.beginPath();
  ctx.moveTo(mastX, -hullHeight - 14);
  ctx.lineTo(mastX + sailSide * boomExtent, -hullHeight - 14);
  ctx.stroke();

  // Mainsail - billows leeward. The sign of the curve X matches sailSide.
  const sailCurve = (16 + forceFactor * 10) * sailSide;
  const inNoGo = twaAbs < 30;
  ctx.fillStyle = inNoGo ? 'rgba(255, 255, 255, 0.25)' : COLORS.sail;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mastX, mastTop);
  ctx.quadraticCurveTo(
    mastX + sailCurve * 1.5,
    (mastTop - hullHeight - 14) / 2,
    mastX + sailSide * boomExtent,
    -hullHeight - 14,
  );
  ctx.lineTo(mastX, -hullHeight - 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Jib (forestay at bow, clew to lee) - smaller; gets blanketed downwind.
  const jibBlanketed = twaAbs > 155;
  ctx.fillStyle = inNoGo
    ? 'rgba(255, 255, 255, 0.25)'
    : jibBlanketed
      ? 'rgba(246, 251, 255, 0.4)'
      : COLORS.sail;
  ctx.beginPath();
  ctx.moveTo(mastX, mastTop + 15);                  // forestay top (near mast top)
  ctx.quadraticCurveTo(
    mastX + sailSide * 18 + sailCurve * 0.3,
    -hullHeight - 55,
    mastX - hullLen * 0.22,                          // jib tack near bow (LHS of hull)
    -hullHeight - 5,
  );
  ctx.lineTo(mastX, -hullHeight - 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Crew figure (simple silhouette) near the windward side
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(15, -hullHeight - 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(13, -hullHeight - 1, 4, 6);
}

function roundedHull(ctx: CanvasRenderingContext2D, beam: number, len: number) {
  const half = len / 2;
  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.quadraticCurveTo(beam, -half * 0.2, beam * 0.6, half);
  ctx.lineTo(-beam * 0.6, half);
  ctx.quadraticCurveTo(-beam, -half * 0.2, 0, -half);
  ctx.closePath();
}

/** Lerp along the shortest arc (so 355° → 5° wraps through 0°). */
function lerpAngle(a: number, b: number, t: number): number {
  const diff = norm(b - a + 540) - 180;
  return norm(a + diff * t);
}

// ============================================================================
// Inline Sail-Trim Trainer - mini version of the standalone /trim-trainer page,
// embedded at the bottom of /simulator so everything sailing-related lives on
// one scroll. Learning model (not race-grade physics).
// ============================================================================

type TCourse = 'close-hauled' | 'beam' | 'broad';
type TWind = 'light' | 'medium' | 'heavy';
type TSailMode = 'both' | 'main-only' | 'jib-only';

function InlineTrimTrainer() {
  const [course, setCourse] = useState<TCourse>('close-hauled');
  const [wind, setWind] = useState<TWind>('medium');
  const [sailMode, setSailMode] = useState<TSailMode>('both');
  const [mainAngle, setMainAngle] = useState(10);
  const [jibAngle, setJibAngle] = useState(8);
  const [reef, setReef] = useState<0 | 1 | 2>(0);
  const [jibFurl, setJibFurl] = useState(100);

  const optMain = course === 'close-hauled' ? 10 : course === 'beam' ? 45 : 75;
  const optJib  = course === 'close-hauled' ? 8  : course === 'beam' ? 35 : 55;

  const mainEff = sailMode === 'jib-only' ? 0 : trimEff(mainAngle, optMain);
  const jibEff  = sailMode === 'main-only' ? 0 : trimEff(jibAngle, optJib) * (jibFurl / 100);
  const reefArea = 1 - reef * 0.22;
  const windMul = wind === 'light' ? 0.65 : wind === 'heavy' ? 1.3 : 1.0;
  const slot = mainEff > 0.55 && jibEff > 0.55 ? 0.15 : 0;
  const mainDrive = mainEff * 0.6 * reefArea;
  const jibDrive = jibEff * 0.4;
  const speed = Math.min(7.5, 7.5 * (mainDrive + jibDrive) * (1 + slot) * windMul);
  const heelSrc = course === 'close-hauled' ? 1.0 : course === 'beam' ? 0.9 : 0.55;
  const heel = Math.min(30, windMul * (mainDrive + jibDrive) * heelSrc * 28);
  const trimEfficiency = sailMode === 'main-only' ? mainEff
    : sailMode === 'jib-only' ? jibEff * (jibFurl / 100)
    : (mainEff * 0.55 + jibEff * 0.45) * (1 + slot / 2);

  // Reset on course change to optimum (quick reset helps)
  const resetOptimum = () => { setMainAngle(optMain); setJibAngle(optJib); setReef(0); setJibFurl(100); };

  // Comment
  const comments: string[] = [];
  if (sailMode !== 'jib-only') {
    const dev = mainAngle - optMain;
    if (dev > 10) comments.push(`Грот перетравлен на +${Math.round(dev)}° - теряешь тягу, выбери.`);
    else if (dev < -10) comments.push(`Грот зажат на ${Math.round(-dev)}° - заполаскивает, потрави.`);
  }
  if (sailMode !== 'main-only') {
    const dev = jibAngle - optJib;
    if (dev > 10) comments.push(`Стаксель открыт слишком, slot слабый.`);
    else if (dev < -10) comments.push(`Стаксель перетянут: закрывает грот в подветр.`);
  }
  if (slot > 0) comments.push('✓ Slot effect работает, оба паруса тянут вместе.');
  if (wind === 'heavy' && reef === 0 && sailMode === 'both') comments.push('Сильный ветер + полный грот = перегруз. Попробуй 1 риф.');
  if (comments.length === 0) comments.push('Настройка близка к оптимуму.');

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr),260px] gap-4">
      {/* Controls + preview */}
      <div className="space-y-3">
        <div className="card p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex-1 min-w-[180px]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Курс</div>
              <div className="grid grid-cols-3 gap-1">
                {(['close-hauled', 'beam', 'broad'] as TCourse[]).map((c) => (
                  <button key={c}
                    onClick={() => { setCourse(c); }}
                    className="px-2 py-1 rounded text-xs font-semibold border"
                    style={{
                      borderColor: course === c ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                      background: course === c ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                      color: course === c ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    }}>
                    {c === 'close-hauled' ? 'Бейдевинд' : c === 'beam' ? 'Галфвинд' : 'Бакштаг'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-[180px]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Ветер</div>
              <div className="grid grid-cols-3 gap-1">
                {(['light', 'medium', 'heavy'] as TWind[]).map((w) => (
                  <button key={w} onClick={() => setWind(w)}
                    className="px-2 py-1 rounded text-xs font-semibold border"
                    style={{
                      borderColor: wind === w ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                      background: wind === w ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                      color: wind === w ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    }}>
                    {w === 'light' ? 'Слабый' : w === 'heavy' ? 'Сильный' : 'Средний'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[180px]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Что поднято</div>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { id: 'both', label: 'Оба' },
                  { id: 'main-only', label: 'Грот' },
                  { id: 'jib-only', label: 'Стаксель' },
                ] as { id: TSailMode; label: string }[]).map((m) => (
                  <button key={m.id} onClick={() => setSailMode(m.id)}
                    className="px-2 py-1 rounded text-xs font-semibold border"
                    style={{
                      borderColor: sailMode === m.id ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                      background: sailMode === m.id ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                      color: sailMode === m.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-[180px]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Рифы грота</div>
              <div className="grid grid-cols-3 gap-1">
                {[0, 1, 2].map((r) => (
                  <button key={r} onClick={() => setReef(r as 0 | 1 | 2)}
                    className="px-2 py-1 rounded text-xs font-semibold border"
                    style={{
                      borderColor: reef === r ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                      background: reef === r ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                      color: reef === r ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    }}>
                    {r === 0 ? 'Полный' : r === 1 ? '1 риф' : '2 рифа'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Angle controls: button-driven, not sliders, per user request */}
        <div className="card p-3 space-y-3">
          <AngleControl
            label={`ГРОТ · угол ${Math.round(mainAngle)}°`}
            value={mainAngle}
            onDelta={(d) => setMainAngle((v) => Math.max(0, Math.min(85, v + d)))}
            optimum={optMain}
            disabled={sailMode === 'jib-only'}
          />
          <AngleControl
            label={`СТАКСЕЛЬ · угол ${Math.round(jibAngle)}°`}
            value={jibAngle}
            onDelta={(d) => setJibAngle((v) => Math.max(0, Math.min(75, v + d)))}
            optimum={optJib}
            disabled={sailMode === 'main-only'}
          />
          <AngleControl
            label={`СТАКСЕЛЬ · раскрытие ${jibFurl}%`}
            value={jibFurl}
            onDelta={(d) => setJibFurl((v) => Math.max(0, Math.min(100, v + d * 2)))}
            optimum={100}
            disabled={sailMode === 'main-only'}
            unitLabel="%"
          />
          <button onClick={resetOptimum}
            className="w-full text-xs py-1.5 rounded border text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition">
            Поставить оптимум
          </button>
        </div>

        {/* Mini preview (live sail angles) */}
        <div className="card p-3 flex justify-center">
          <TrimPreview course={course} mainAngle={mainAngle} jibAngle={jibAngle} jibFurl={jibFurl} reef={reef} sailMode={sailMode} optMain={optMain} optJib={optJib} />
        </div>
      </div>

      {/* Effects */}
      <div className="space-y-3">
        <div className="card p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Эффект</div>
          <Row label="Trim efficiency" value={`${Math.round(trimEfficiency * 100)}%`}
               color={trimEfficiency > 0.75 ? 'var(--success)' : trimEfficiency > 0.5 ? 'var(--accent-cyan)' : trimEfficiency > 0.25 ? 'var(--warning)' : 'var(--danger)'}
               bar={trimEfficiency * 100} />
          <Row label="Скорость" value={`${speed.toFixed(1)} kts`} color="var(--accent-cyan)" />
          <Row label="Крен" value={`${Math.round(heel)}°`}
               color={heel > 22 ? 'var(--danger)' : heel > 15 ? 'var(--warning)' : 'var(--success)'} />
          <div className="mt-3 text-[10px] text-[var(--text-muted)]">
            Грот: {Math.round(mainEff * 100)}% · Стакс: {Math.round(jibEff * 100)}%
          </div>
        </div>
        <div className="card p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Комментарий</div>
          <ul className="space-y-1 text-xs text-[var(--text-secondary)] leading-relaxed">
            {comments.map((c, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="shrink-0 mt-1 w-1 h-1 rounded-full"
                      style={{ background: c.startsWith('✓') ? 'var(--success)' : 'var(--accent-cyan)' }} />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function trimEff(angle: number, optimum: number): number {
  const dev = Math.abs(angle - optimum);
  if (dev >= 35) return 0;
  return Math.max(0, 1 - (dev / 35) ** 1.4);
}

function AngleControl({ label, onDelta, optimum, value, disabled, unitLabel }: {
  label: string;
  value: number;
  onDelta: (d: number) => void;
  optimum: number;
  disabled?: boolean;
  unitLabel?: string;
}) {
  return (
    <div style={{ opacity: disabled ? 0.35 : 1 }}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-semibold tracking-wide text-[var(--text-primary)]">{label}</div>
        <div className="text-[10px] text-[var(--text-muted)]">оптимум: {optimum}{unitLabel ?? '°'}</div>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => onDelta(-5)} disabled={disabled}
          className="flex-1 py-1.5 rounded text-xs font-bold border disabled:opacity-40"
          style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>−5</button>
        <button onClick={() => onDelta(-1)} disabled={disabled}
          className="w-10 py-1.5 rounded text-xs border disabled:opacity-40"
          style={{ borderColor: 'rgba(139, 167, 184, 0.2)', color: 'var(--text-secondary)' }}>−1</button>
        <button onClick={() => onDelta(1)} disabled={disabled}
          className="w-10 py-1.5 rounded text-xs border disabled:opacity-40"
          style={{ borderColor: 'rgba(139, 167, 184, 0.2)', color: 'var(--text-secondary)' }}>+1</button>
        <button onClick={() => onDelta(5)} disabled={disabled}
          className="flex-1 py-1.5 rounded text-xs font-bold border disabled:opacity-40"
          style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}>+5</button>
      </div>
    </div>
  );
}

function Row({ label, value, color, bar }: { label: string; value: string; color: string; bar?: number }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>{label}</span>
        <span className="font-mono font-bold text-sm" style={{ color }}>{value}</span>
      </div>
      {typeof bar === 'number' && (
        <div className="h-1 rounded-full overflow-hidden mt-0.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="h-full transition-all" style={{ width: `${Math.max(0, Math.min(100, bar))}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

function TrimPreview({ course, mainAngle, jibAngle, jibFurl, reef, sailMode, optMain, optJib }: {
  course: TCourse; mainAngle: number; jibAngle: number; jibFurl: number;
  reef: 0 | 1 | 2; sailMode: TSailMode; optMain: number; optJib: number;
}) {
  const W = 180, H = 240;
  const boatRot = course === 'close-hauled' ? 45 : course === 'beam' ? 90 : 135;
  const areaMul = 1 - reef * 0.22;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <defs>
        <linearGradient id="tp-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#061428" /><stop offset="1" stopColor="#0a1f3d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="8" fill="url(#tp-bg)" />
      {/* Wind from top */}
      <g stroke="#00d4ff" strokeWidth="1.2" fill="#00d4ff">
        <line x1={W/2} y1={8} x2={W/2} y2={32} />
        <polygon points={`${W/2 - 4},30 ${W/2 + 4},30 ${W/2},36`} />
        <text x={W/2} y="50" textAnchor="middle" fontSize="9" fill="#00d4ff">ветер</text>
      </g>
      <g transform={`translate(${W/2} ${H/2 + 20}) rotate(${boatRot})`}>
        {/* Hull */}
        <path d="M 0 -36 Q 12 0 7 30 L -7 30 Q -12 0 0 -36 Z" fill="#d7e8f4" stroke="#8fb4c9" strokeWidth="1" />
        <polygon points="-4,-32 4,-32 0,-40" fill="#8fb4c9" />
        <circle cx="0" cy="-8" r="2" fill="#333" />
        {/* Jib */}
        {sailMode !== 'main-only' && (
          <g transform={`translate(0 -22) rotate(${jibAngle})`} opacity={jibFurl / 100}>
            <path d={`M 0 0 Q ${4 * (jibFurl/100)} 10 ${1.5 * (jibFurl/100)} 20 L 0 20 Z`}
                  fill="#f6fbff" stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {/* Main */}
        {sailMode !== 'jib-only' && (
          <g transform={`rotate(${mainAngle}) scale(1 ${areaMul})`}>
            <path d="M 0 -8 Q 10 10 2 30 L 0 30 Z" fill="#f6fbff" stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {/* Ghost optimum */}
        {sailMode === 'both' && (
          <>
            <g transform={`translate(0 -22) rotate(${optJib})`} opacity="0.35">
              <path d="M 0 0 Q 4 10 1.5 20 L 0 20 Z" fill="none" stroke="#44ff88" strokeWidth="1" strokeDasharray="2 2" />
            </g>
            <g transform={`rotate(${optMain})`} opacity="0.35">
              <path d="M 0 -8 Q 10 10 2 30 L 0 30 Z" fill="none" stroke="#44ff88" strokeWidth="1" strokeDasharray="2 2" />
            </g>
          </>
        )}
      </g>
      <text x={W/2} y={H - 8} textAnchor="middle" fontSize="9" fill="#5a7a8a">
        {course === 'close-hauled' ? 'бейдевинд 45°' : course === 'beam' ? 'галфвинд 90°' : 'бакштаг 135°'}
      </text>
    </svg>
  );
}
