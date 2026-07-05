'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { legacyPick } from '@/lib/languages';
import { pointsOfSail, type PointOfSail } from '@/data/sailing-data';
import { useI18n } from '@/lib/i18n';
// Shared no-go half-angle (42 deg) from the VPP engine so Basics, Trainer
// and the 3D boat all teach the same cone.
import { NO_GO_HALF_DEG } from '@/lib/sailing-physics';

// ---- Constants ----
const DEFAULT_WIND_DIR = 180; // Wind blows FROM the top of the screen (180 = from south in screen coords means arrow points down)
const MAX_SPEED_KTS = 7.5;

const COLORS = {
  bgPrimary: '#0a1628',
  bgCard: '#152540',
  accentCyan: '#00d4ff',
  textPrimary: '#e8f4f8',
  textSecondary: '#8ba7b8',
  textMuted: '#5a7a8a',
  danger: '#ff4444',
  water1: '#0b1e38',
  water2: '#081830',
  water3: '#0d2445',
  hullDark: '#1a2d4d',
  hullLight: '#243a5c',
  deckColor: '#2a4570',
  boomColor: '#8899aa',
};

// ---- Helpers ----
function degToRad(d: number) { return (d * Math.PI) / 180; }
function radToDeg(r: number) { return (r * 180) / Math.PI; }

function normalizeAngle(a: number): number {
  a = a % 360;
  if (a < 0) a += 360;
  return a;
}

function windAngle(boatHeading: number, windDir: number): number {
  let diff = Math.abs(normalizeAngle(boatHeading) - normalizeAngle(windDir));
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function getPointOfSail(wa: number): PointOfSail {
  for (const p of pointsOfSail) {
    if (wa >= p.angleMin && wa < p.angleMax) return p;
  }
  return pointsOfSail[pointsOfSail.length - 1];
}

function getTackSide(boatHeading: number, windDir: number): 'port' | 'starboard' {
  // Tack = which side of the boat the wind HITS.
  // Relative angle = wind source bearing - bow bearing (normalized 0-360).
  //   0       = wind dead ahead (in irons)
  //   1..179  = wind source to the right of the bow = wind hits starboard
  //             side = STARBOARD tack
  //   180     = wind dead astern
  //   181..359= wind source to the left of bow = wind hits port side =
  //             PORT tack
  //
  // The previous formula used `boatHeading - windDir` which is opposite in
  // sign and flipped the tack. That also flipped the sail-rendering side via
  // `tackSign` below, so the main sail drew on the WINDWARD side of the
  // boat (physically wrong; real sails go to leeward under wind pressure).
  const norm = normalizeAngle(windDir - boatHeading);
  if (norm > 0 && norm < 180) return 'starboard';
  return 'port';
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }

// ---- Wave pattern cache ----
type WaveDot = { x: number; y: number; r: number; phase: number; speed: number };
function generateWaveDots(w: number, h: number): WaveDot[] {
  const dots: WaveDot[] = [];
  const count = Math.floor((w * h) / 1800);
  for (let i = 0; i < count; i++) {
    dots.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.5 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
    });
  }
  return dots;
}

// ---- Wake particle ----
type WakeParticle = { x: number; y: number; age: number; maxAge: number; size: number; dx: number; dy: number };

// ============================================================
// Main Component
// ============================================================
export default function SimulatorPage() {
  const { tp, lang } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [boatAngle, setBoatAngle] = useState(90); // degrees, 0 = pointing up (into wind)
  const [windDir, setWindDir] = useState(DEFAULT_WIND_DIR); // compass bearing wind blows from
  const [isDragging, setIsDragging] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 600 });
  const windDirRef = useRef(DEFAULT_WIND_DIR);
  // Keep ref in sync so the animation loop (which reads via closure) sees fresh value.
  useEffect(() => { windDirRef.current = windDir; }, [windDir]);

  // The iOS app embeds this page chromelessly via ?embed=1 - hide the tier
  // header there. Read from window.location instead of useSearchParams so
  // this client page does not need a Suspense boundary.
  const [isEmbed, setIsEmbed] = useState(false);
  useEffect(() => {
    try {
      setIsEmbed(new URLSearchParams(window.location.search).get('embed') === '1');
    } catch { /* ignore */ }
  }, []);

  const wakeRef = useRef<WakeParticle[]>([]);
  const dotsRef = useRef<WaveDot[]>([]);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const smoothAngleRef = useRef(90);
  const smoothSpeedRef = useRef(0);

  // Drag tracking
  const dragStartRef = useRef({ x: 0, y: 0, startAngle: 0 });

  // Computed values
  const wa = windAngle(boatAngle, windDir);
  const pos = getPointOfSail(wa);
  const tack = getTackSide(boatAngle, windDir);
  const speed = MAX_SPEED_KTS * pos.speedFactor;

  // ---- Canvas resize ----
  const handleResize = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 700);
    setCanvasSize({ w: size, h: size });
    dotsRef.current = generateWaveDots(size, size);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // ---- Keyboard ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setBoatAngle((a) => normalizeAngle(a - 3));
      } else if (e.key === 'ArrowRight') {
        setBoatAngle((a) => normalizeAngle(a + 3));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ---- Mouse / Touch drag on canvas ----
  //
  // Two drag targets:
  //   - The boat (drag anywhere near center) rotates the boat heading.
  //   - The wind arrow (drag near the arrow shaft, which runs from the
  //     direction the wind blows FROM toward the boat center) rotates the
  //     wind direction.
  //
  // Disambiguation on pointer-down: compute angular distance between the
  // pointer (in scene polar coords) and the current wind-from vector. If
  // within +-25 deg AND outside the inner radius (not on the boat), drag
  // wind. Otherwise drag boat.
  //
  // This mirrors the user's mental model: "I grab where the wind symbol
  // sits to turn wind; I grab where the boat sits to turn the boat."
  const dragTargetRef = useRef<'boat' | 'wind'>('boat');

  const getPointerPolar = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { angle: 0, radius: 0 };
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const angle = radToDeg(Math.atan2(mx - cx, -(my - cy)));
      const radius = Math.hypot(mx - cx, my - cy) / Math.min(rect.width, rect.height);
      return { angle: normalizeAngle(angle), radius };
    },
    [],
  );

  const getAngleFromPointer = useCallback(
    (clientX: number, clientY: number) => getPointerPolar(clientX, clientY).angle,
    [getPointerPolar],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      const { angle, radius } = getPointerPolar(e.clientX, e.clientY);
      // Wind from-direction in scene polar coords: same as windDir (wind
      // arrow draws at windDir - 90 in radians-from-+x, which is "from"
      // that bearing in our normalizeAngle space).
      const windFromAngle = normalizeAngle(windDirRef.current);
      let delta = Math.abs(angle - windFromAngle);
      if (delta > 180) delta = 360 - delta;
      // Hit test: if the pointer is far from center (radius > 0.25 of the
      // canvas min side) AND within 25 deg of wind-from direction, grab
      // the wind. Boat is near center so this leaves plenty of room.
      const grabbingWind = radius > 0.25 && delta < 25;
      dragTargetRef.current = grabbingWind ? 'wind' : 'boat';
      dragStartRef.current = { x: e.clientX, y: e.clientY, startAngle: angle };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getPointerPolar],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const angle = getAngleFromPointer(e.clientX, e.clientY);
      let delta = angle - dragStartRef.current.startAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      if (dragTargetRef.current === 'wind') {
        setWindDir((prev) => normalizeAngle(prev + delta));
      } else {
        setBoatAngle((prev) => normalizeAngle(prev + delta));
      }
      dragStartRef.current.startAngle = angle;
    },
    [isDragging, getAngleFromPointer],
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ---- Drawing ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = canvasSize;
    // Match the real device pixel ratio (capped at 2: higher densities burn
    // fill rate with no visible gain) instead of a hardcoded 2x backing store.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    if (dotsRef.current.length === 0) {
      dotsRef.current = generateWaveDots(w, h);
    }

    const draw = (timestamp: number) => {
      const dt = lastFrameRef.current ? (timestamp - lastFrameRef.current) / 1000 : 0.016;
      lastFrameRef.current = timestamp;
      timeRef.current += dt;
      const t = timeRef.current;

      // Smooth the angle and speed for rendering
      smoothAngleRef.current = lerp(smoothAngleRef.current, boatAngle, clamp(dt * 8, 0, 1));
      const currentWA = windAngle(smoothAngleRef.current, windDirRef.current);
      const currentPOS = getPointOfSail(currentWA);
      const targetSpeed = MAX_SPEED_KTS * currentPOS.speedFactor;
      smoothSpeedRef.current = lerp(smoothSpeedRef.current, targetSpeed, clamp(dt * 3, 0, 1));

      const cx = w / 2;
      const cy = h / 2;
      const boatRad = degToRad(smoothAngleRef.current);

      // ===== BACKGROUND =====
      ctx.fillStyle = COLORS.water1;
      ctx.fillRect(0, 0, w, h);

      // Subtle wave gradient
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.7);
      grd.addColorStop(0, COLORS.water3);
      grd.addColorStop(1, COLORS.water2);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      // Wave dots
      ctx.globalAlpha = 0.35;
      for (const dot of dotsRef.current) {
        const px = dot.x + Math.sin(t * dot.speed + dot.phase) * 3;
        const py = dot.y + Math.cos(t * dot.speed * 0.7 + dot.phase) * 2;
        ctx.fillStyle = 'rgba(80, 160, 220, 0.5)';
        ctx.beginPath();
        ctx.arc(px, py, dot.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Animated wave lines
      ctx.strokeStyle = 'rgba(60, 140, 200, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const yOff = (h / 8) * i + 20;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = yOff + Math.sin((x / 60) + t * 0.8 + i * 0.7) * 6 + Math.sin((x / 30) + t * 1.2 + i) * 3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // ===== NO-GO ZONE =====
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // Draw sector from boat center
      // Wind from top = 180 deg = PI rad in standard screen coords
      // But in canvas, 0 is right, so we need to adjust: screen angle = 90 - degree
      const sectorStartRad = degToRad(windDirRef.current - NO_GO_HALF_DEG - 90);
      const sectorEndRad = degToRad(windDirRef.current + NO_GO_HALF_DEG - 90);
      ctx.arc(0, 0, w * 0.45, sectorStartRad, sectorEndRad);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 50, 50, 0.08)';
      ctx.fill();

      // No-go zone border lines
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const len = w * 0.45;
      ctx.lineTo(Math.cos(sectorStartRad) * len, Math.sin(sectorStartRad) * len);
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sectorEndRad) * len, Math.sin(sectorEndRad) * len);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ===== POINT-OF-SAIL SECTORS (faint) =====
      ctx.save();
      ctx.translate(cx, cy);
      for (const p of pointsOfSail) {
        if (p.id === 'in-irons') continue;
        // Draw on both sides
        for (const side of [-1, 1]) {
          const aStart = degToRad(windDirRef.current + p.angleMin * side - 90);
          const aEnd = degToRad(windDirRef.current + p.angleMax * side - 90);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          if (side === 1) {
            ctx.arc(0, 0, w * 0.42, aStart, aEnd);
          } else {
            ctx.arc(0, 0, w * 0.42, aEnd, aStart);
          }
          ctx.closePath();
          ctx.fillStyle = p.color + '08';
          ctx.fill();
        }
      }
      ctx.restore();

      // ===== COMPASS RING =====
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      // Degree ticks
      for (let deg = 0; deg < 360; deg += 10) {
        const r = degToRad(deg - 90);
        const inner = deg % 30 === 0 ? w * 0.39 : w * 0.41;
        const outer = w * 0.42;
        ctx.strokeStyle = deg % 30 === 0 ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.08)';
        ctx.lineWidth = deg % 30 === 0 ? 1.5 : 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(r) * inner, Math.sin(r) * inner);
        ctx.lineTo(Math.cos(r) * outer, Math.sin(r) * outer);
        ctx.stroke();
      }

      // Cardinal labels
      const cardinals = [
        { deg: 0, label: 'N' },
        { deg: 90, label: 'E' },
        { deg: 180, label: 'S' },
        { deg: 270, label: 'W' },
      ];
      ctx.font = `bold ${Math.max(10, w * 0.02)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      for (const c of cardinals) {
        const r = degToRad(c.deg - 90);
        const dist = w * 0.45;
        ctx.fillText(c.label, Math.cos(r) * dist, Math.sin(r) * dist);
      }
      ctx.restore();

      // ===== WIND ARROW =====
      ctx.save();
      ctx.translate(cx, cy);
      // Wind comes from top (180), so arrow points downward from top
      const windArrowRad = degToRad(windDirRef.current - 90); // point from which wind comes
      const arrowFromDist = w * 0.38;
      const arrowLen = w * 0.15;
      const ax1 = Math.cos(windArrowRad) * arrowFromDist;
      const ay1 = Math.sin(windArrowRad) * arrowFromDist;
      const ax2 = Math.cos(windArrowRad) * (arrowFromDist - arrowLen);
      const ay2 = Math.sin(windArrowRad) * (arrowFromDist - arrowLen);

      // Animated dashes for wind
      for (let i = 0; i < 5; i++) {
        const frac = ((t * 0.5 + i * 0.2) % 1);
        const px = lerp(ax1, ax2, frac);
        const py = lerp(ay1, ay2, frac);
        const alpha = Math.sin(frac * Math.PI) * 0.4;
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main arrow shaft
      const gradient = ctx.createLinearGradient(ax1, ay1, ax2, ay2);
      gradient.addColorStop(0, 'rgba(0, 229, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(0, 229, 255, 0.3)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ax1, ay1);
      ctx.lineTo(ax2, ay2);
      ctx.stroke();

      // Arrowhead
      const headSize = w * 0.025;
      const headAngle = Math.atan2(ay2 - ay1, ax2 - ax1);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(ax2, ay2);
      ctx.lineTo(ax2 - Math.cos(headAngle - 0.4) * headSize, ay2 - Math.sin(headAngle - 0.4) * headSize);
      ctx.lineTo(ax2 - Math.cos(headAngle + 0.4) * headSize, ay2 - Math.sin(headAngle + 0.4) * headSize);
      ctx.closePath();
      ctx.fill();

      // "WIND" label
      ctx.font = `bold ${Math.max(9, w * 0.02)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
      const labelDist = arrowFromDist + w * 0.04;
      // Bilingual "<local> / WIND" everywhere the local word differs from EN
      // (DE "WIND" is spelled the same, so it collapses to a single word).
      ctx.fillText(
        lang === 'ru' ? 'ВЕТЕР / WIND'
          : lang === 'pl' ? 'WIATR / WIND'
          : lang === 'es' ? 'VIENTO / WIND'
          : lang === 'fr' ? 'VENT / WIND'
          : lang === 'it' ? 'VENTO / WIND'
          : 'WIND', // en + de
        Math.cos(windArrowRad) * labelDist,
        Math.sin(windArrowRad) * labelDist,
      );

      ctx.restore();

      // ===== WAKE / TRAIL =====
      // Add new wake particles based on speed
      if (smoothSpeedRef.current > 0.3) {
        const spawnRate = smoothSpeedRef.current / MAX_SPEED_KTS;
        if (Math.random() < spawnRate * 0.6) {
          const sternX = cx - Math.sin(boatRad) * (w * 0.06);
          const sternY = cy + Math.cos(boatRad) * (w * 0.06);
          const spread = (Math.random() - 0.5) * 8;
          wakeRef.current.push({
            x: sternX + Math.cos(boatRad) * spread,
            y: sternY + Math.sin(boatRad) * spread,
            age: 0,
            maxAge: 2 + Math.random(),
            size: 2 + Math.random() * 3,
            dx: -Math.sin(boatRad) * (-0.3) + (Math.random() - 0.5) * 0.3,
            dy: Math.cos(boatRad) * (-0.3) + (Math.random() - 0.5) * 0.3,
          });
        }
      }

      // Update and draw wake
      wakeRef.current = wakeRef.current.filter((p) => {
        p.age += dt;
        p.x += p.dx;
        p.y += p.dy;
        if (p.age >= p.maxAge) return false;
        const alpha = (1 - p.age / p.maxAge) * 0.3;
        const size = p.size * (1 + p.age * 0.5);
        ctx.fillStyle = `rgba(160, 210, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      // V-wake lines
      if (smoothSpeedRef.current > 0.5) {
        const wakeAlpha = clamp(smoothSpeedRef.current / MAX_SPEED_KTS * 0.3, 0, 0.3);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(boatRad);
        ctx.strokeStyle = `rgba(160, 210, 255, ${wakeAlpha})`;
        ctx.lineWidth = 1;
        const wakeLen = w * 0.12 * (smoothSpeedRef.current / MAX_SPEED_KTS);
        ctx.beginPath();
        ctx.moveTo(0, w * 0.06);
        ctx.lineTo(-wakeLen * 0.5, w * 0.06 + wakeLen);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, w * 0.06);
        ctx.lineTo(wakeLen * 0.5, w * 0.06 + wakeLen);
        ctx.stroke();
        ctx.restore();
      }

      // ===== YACHT =====
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(boatRad);

      const boatLen = w * 0.14;
      const boatWid = w * 0.035;

      // Hull shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      drawHull(ctx, boatLen, boatWid, 3, 3);
      ctx.fill();

      // Hull
      const hullGrad = ctx.createLinearGradient(-boatWid, 0, boatWid, 0);
      hullGrad.addColorStop(0, COLORS.hullDark);
      hullGrad.addColorStop(0.5, COLORS.hullLight);
      hullGrad.addColorStop(1, COLORS.hullDark);
      ctx.fillStyle = hullGrad;
      ctx.beginPath();
      drawHull(ctx, boatLen, boatWid, 0, 0);
      ctx.fill();

      // Hull outline
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      drawHull(ctx, boatLen, boatWid, 0, 0);
      ctx.stroke();

      // Deck detail
      ctx.fillStyle = COLORS.deckColor;
      ctx.beginPath();
      drawHull(ctx, boatLen * 0.85, boatWid * 0.7, 0, boatLen * 0.02);
      ctx.fill();

      // Cockpit
      const cockpitY = boatLen * 0.2;
      ctx.fillStyle = 'rgba(10, 22, 40, 0.6)';
      ctx.beginPath();
      ctx.ellipse(0, cockpitY, boatWid * 0.45, boatLen * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Mast position (slightly forward of center)
      const mastY = -boatLen * 0.08;
      const mastR = w * 0.005;

      // ===== SAILS =====
      // Calculate sail angle based on point of sail
      const sailDeg = currentPOS.sailAngle;
      const tackSign = getTackSide(smoothAngleRef.current, windDirRef.current) === 'port' ? 1 : -1;
      const sailRad = degToRad(sailDeg * tackSign);

      // Jib (foresail) - forward triangle
      if (currentPOS.id !== 'in-irons') {
        const jibTip = -boatLen * 0.48; // bow
        const jibFoot = mastY;
        const jibSpread = boatWid * (0.6 + sailDeg / 120);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, jibTip); // head of jib at bow
        ctx.moveTo(0, mastY); // tack at mast
        // Curve for the jib
        const jibCurveX = Math.sin(sailRad) * jibSpread * 0.7;
        const jibCurveY = (jibTip + jibFoot) / 2;
        ctx.quadraticCurveTo(
          jibCurveX,
          jibCurveY,
          0,
          jibTip,
        );

        const jibGrad = ctx.createLinearGradient(0, jibTip, jibCurveX, jibCurveY);
        jibGrad.addColorStop(0, `rgba(232, 238, 244, ${0.5 + currentPOS.speedFactor * 0.3})`);
        jibGrad.addColorStop(1, `rgba(176, 196, 216, ${0.3 + currentPOS.speedFactor * 0.3})`);
        ctx.fillStyle = jibGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 220, 240, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      } else {
        // Luffing jib - flapping
        const flutter = Math.sin(t * 8) * 5;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, mastY);
        ctx.quadraticCurveTo(flutter, (mastY + (-boatLen * 0.48)) / 2, 0, -boatLen * 0.48);
        ctx.strokeStyle = 'rgba(200, 220, 240, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }

      // Mainsail
      if (currentPOS.id !== 'in-irons') {
        const mainHead = mastY;
        const mainFoot = mastY + boatLen * 0.45;
        const mainSpread = boatWid * (0.8 + sailDeg / 100);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, mainHead); // head (top of mast)

        // Curved sail shape
        const mainCurveX = Math.sin(sailRad) * mainSpread;
        const mainMidY = (mainHead + mainFoot) / 2;

        // Leech (trailing edge curve)
        ctx.quadraticCurveTo(
          mainCurveX * 1.1,
          mainMidY - boatLen * 0.05,
          mainCurveX * 0.8,
          mainFoot,
        );
        // Foot back to boom
        ctx.lineTo(0, mainFoot);
        ctx.closePath();

        const mainGrad = ctx.createLinearGradient(0, mainHead, mainCurveX, mainMidY);
        mainGrad.addColorStop(0, `rgba(232, 238, 244, ${0.55 + currentPOS.speedFactor * 0.3})`);
        mainGrad.addColorStop(1, `rgba(176, 196, 216, ${0.35 + currentPOS.speedFactor * 0.2})`);
        ctx.fillStyle = mainGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 220, 240, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Batten lines on mainsail
        ctx.strokeStyle = 'rgba(180, 200, 220, 0.15)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i <= 3; i++) {
          const frac = i / 4;
          const bY = lerp(mainHead, mainFoot, frac);
          const bX = Math.sin(sailRad) * mainSpread * (1 - frac * 0.3) * frac;
          ctx.beginPath();
          ctx.moveTo(0, bY);
          ctx.lineTo(bX * 0.9, bY);
          ctx.stroke();
        }

        // Boom
        ctx.strokeStyle = COLORS.boomColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, mastY);
        ctx.lineTo(mainCurveX * 0.8, mainFoot);
        ctx.stroke();

        ctx.restore();
      } else {
        // Luffing mainsail
        const flutter = Math.sin(t * 7 + 1) * 6;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, mastY);
        const mainFoot = mastY + boatLen * 0.45;
        ctx.quadraticCurveTo(flutter, (mastY + mainFoot) / 2, 0, mainFoot);
        ctx.strokeStyle = 'rgba(200, 220, 240, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Boom limp
        ctx.strokeStyle = COLORS.boomColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, mastY);
        ctx.lineTo(flutter * 0.5, mainFoot);
        ctx.stroke();
        ctx.restore();
      }

      // Mast dot
      ctx.fillStyle = COLORS.boomColor;
      ctx.beginPath();
      ctx.arc(0, mastY, mastR, 0, Math.PI * 2);
      ctx.fill();

      // Forestay line (mast to bow)
      ctx.strokeStyle = 'rgba(150, 170, 190, 0.3)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, mastY);
      ctx.lineTo(0, -boatLen * 0.48);
      ctx.stroke();

      // Backstay line (mast to stern)
      ctx.strokeStyle = 'rgba(150, 170, 190, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, mastY);
      ctx.lineTo(0, boatLen * 0.45);
      ctx.stroke();

      // Bow direction indicator dot
      ctx.fillStyle = COLORS.accentCyan;
      ctx.globalAlpha = 0.6 + Math.sin(t * 2) * 0.2;
      ctx.beginPath();
      ctx.arc(0, -boatLen * 0.52, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore(); // End yacht transform

      // ===== HEADING LINE =====
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(boatRad);
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -boatLen * 0.55);
      ctx.lineTo(0, -w * 0.42);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ===== WIND ANGLE ARC =====
      ctx.save();
      ctx.translate(cx, cy);
      const arcR = w * 0.18;
      const windScreenRad = degToRad(windDirRef.current - 90);
      const boatScreenRad = degToRad(smoothAngleRef.current - 90);
      ctx.strokeStyle = currentPOS.color + '60';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Draw arc from wind direction to boat heading (shorter path)
      const startA = windScreenRad;
      const endA = boatScreenRad;
      // Determine direction
      let diff = endA - startA;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      if (diff >= 0) {
        ctx.arc(0, 0, arcR, startA, startA + diff);
      } else {
        ctx.arc(0, 0, arcR, startA + diff, startA);
      }
      ctx.stroke();

      // Angle label on arc
      const midAngleRad = startA + diff / 2;
      const labelR = arcR + 12;
      ctx.font = `bold ${Math.max(11, w * 0.022)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = currentPOS.color;
      ctx.fillText(
        `${Math.round(currentWA)}°`,
        Math.cos(midAngleRad) * labelR,
        Math.sin(midAngleRad) * labelR,
      );
      ctx.restore();

      // ===== POINT OF SAIL LABEL ON CANVAS =====
      ctx.save();
      ctx.font = `bold ${Math.max(12, w * 0.025)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = currentPOS.color;
      ctx.fillText(
        legacyPick(currentPOS, 'name', lang),
        cx,
        h - 30,
      );
      ctx.font = `${Math.max(10, w * 0.018)}px sans-serif`;
      ctx.fillStyle = COLORS.textSecondary;
      // In English mode the top label already IS English, skip the duplicate subtitle.
      if (lang !== 'en') {
        ctx.fillText(currentPOS.nameEn, cx, h - 14);
      }
      ctx.restore();

      // ===== CURSOR HINT =====
      if (!isDragging) {
        ctx.save();
        ctx.font = `${Math.max(9, w * 0.016)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(139, 167, 184, 0.4)';
        ctx.fillText(
          lang === 'ru' ? 'перетащи / стрелки' : lang === 'pl' ? 'przeciagnij / strzalki' : 'drag / arrow keys',
          cx,
          18,
        );
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize, boatAngle, isDragging, lang]);

  // ---- Slider handler ----
  const onSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBoatAngle(parseFloat(e.target.value));
  }, []);

  const onReset = useCallback(() => {
    setBoatAngle(90);
    wakeRef.current = [];
  }, []);

  // ---- Render ----
  return (
    <div className="page-enter flex flex-col min-h-[calc(100vh-56px)]">
      {/* Tier header: Basics (this page) / Trainer / 3D Boat.
          Hidden entirely under ?embed=1 (iOS app embeds this page chromelessly). */}
      {!isEmbed && (
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-5 py-2 border-b"
           style={{ background: 'rgba(5, 11, 24, 0.92)', borderColor: 'rgba(0, 212, 255, 0.14)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline text-xs truncate" style={{ color: COLORS.textMuted }}>
            {tp(
              'Простая лодка на круге: крути лодку и ветер, смотри что происходит.',
              'Simple boat on a circle: spin the boat and the wind, watch what happens.',
              'Prosta lodka na kole: obracaj lodke i wiatr, zobacz co sie dzieje.',
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-semibold px-2 py-1 rounded-md border"
                style={{ background: 'rgba(0, 212, 255, 0.14)', borderColor: 'rgba(0, 212, 255, 0.35)', color: COLORS.accentCyan }}>
            {tp('Основы', 'Basics', 'Podstawy', { es: 'Basico', fr: 'Bases', de: 'Grundlagen', it: 'Base' })}
          </span>
          <a href="/simulator-v3" className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[#00d4ff]"
             style={{ borderColor: 'rgba(82, 255, 142, 0.4)', color: '#44ff88' }}>
            {tp('Тренажёр', 'Trainer', 'Trener', { es: 'Entrenador', fr: 'Entraineur', de: 'Trainer', it: 'Trainer' })}
          </a>
          <a href="/simulator2" className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[#00d4ff]"
             style={{ borderColor: 'rgba(139, 167, 184, 0.3)', color: COLORS.textSecondary }}>
            {tp('Лодка 3D', '3D Boat', 'Lodka 3D', { es: 'Barco 3D', fr: 'Bateau 3D', de: 'Boot 3D', it: 'Barca 3D' })}
          </a>
        </div>
      </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1">
      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-[400px]"
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.w * 2}
          height={canvasSize.h * 2}
          style={{
            width: canvasSize.w,
            height: canvasSize.h,
            borderRadius: 16,
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          className="border border-[rgba(0,212,255,0.1)] shadow-lg"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      {/* Info Panel */}
      <div className="lg:w-[380px] shrink-0 p-4 lg:p-6 flex flex-col gap-4 overflow-y-auto lg:max-h-[calc(100vh-56px)]"
           style={{ background: 'rgba(15, 32, 53, 0.6)' }}>

        {/* Course Name */}
        <div className="card p-4">
          <div className="text-xs font-medium tracking-wider mb-2"
               style={{ color: COLORS.textMuted }}>
            {tp('КУРС / POINT OF SAIL', 'POINT OF SAIL', 'KURS / POINT OF SAIL')}
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: pos.color }}>
            {legacyPick(pos, 'name', lang)}
          </div>
          {lang !== 'en' && (
            <div className="text-sm" style={{ color: COLORS.textSecondary }}>
              {pos.nameEn}
            </div>
          )}
        </div>

        {/* Angle + Speed Row */}
        <div className="flex gap-3">
          {/* Wind Angle */}
          <div className="card p-4 flex-1">
            <div className="text-xs font-medium tracking-wider mb-2"
                 style={{ color: COLORS.textMuted }}>
              {tp('УГОЛ К ВЕТРУ', 'WIND ANGLE', 'KAT DO WIATRU')}
            </div>
            <div className="text-3xl font-bold font-mono" style={{ color: COLORS.accentCyan }}>
              {Math.round(wa)}°
            </div>
            <div className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
              {tp('Угол к ветру', 'Wind angle', 'Kat do wiatru', {
                es: 'Angulo al viento',
                fr: 'Angle au vent',
                de: 'Windwinkel',
                it: 'Angolo al vento',
              })}
            </div>
          </div>

          {/* Tack */}
          <div className="card p-4 flex-1">
            <div className="text-xs font-medium tracking-wider mb-2"
                 style={{ color: COLORS.textMuted }}>
              {tp('ГАЛС / TACK', 'TACK', 'HALS / TACK')}
            </div>
            <div className="text-lg font-bold"
                 style={{ color: tack === 'starboard' ? '#44ff88' : '#ff8844' }}>
              {tack === 'starboard'
                ? tp('Правый', 'Starboard', 'Prawy')
                : tp('Левый', 'Port', 'Lewy')}
            </div>
            <div className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
              {tack === 'starboard' ? 'Starboard' : 'Port'}
            </div>
          </div>
        </div>

        {/* Speed Bar */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium tracking-wider"
                 style={{ color: COLORS.textMuted }}>
              {tp('СКОРОСТЬ / SPEED', 'SPEED', 'PREDKOSC / SPEED')}
            </div>
            <div className="text-sm font-bold font-mono" style={{ color: COLORS.accentCyan }}>
              {speed.toFixed(1)} kts
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(pos.speedFactor * 100).toFixed(0)}%`,
                background: `linear-gradient(90deg, ${pos.color}88, ${pos.color})`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: COLORS.textMuted }}>0</span>
            <span className="text-xs" style={{ color: COLORS.textMuted }}>
              {MAX_SPEED_KTS} kts
            </span>
          </div>
        </div>

        {/* Sail Work */}
        <div className="card p-4">
          <div className="text-xs font-medium tracking-wider mb-2"
               style={{ color: COLORS.textMuted }}>
            {tp('РАБОТА ПАРУСОВ / SAIL TRIM', 'SAIL TRIM', 'USTAWIENIE ZAGLI / SAIL TRIM')}
          </div>
          <div className="text-sm font-medium mb-1" style={{ color: COLORS.textPrimary }}>
            {legacyPick(pos, 'sailWork', lang)}
          </div>
          {lang !== 'en' && (
            <div className="text-xs" style={{ color: COLORS.textSecondary }}>
              {pos.sailWorkEn}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <div className="text-xs px-2 py-0.5 rounded-full"
                 style={{
                   background: pos.color + '20',
                   color: pos.color,
                   border: `1px solid ${pos.color}30`,
                 }}>
              {tp('Угол паруса:', 'Sail angle:', 'Kat zagla:', {
                es: 'Angulo de vela:',
                fr: 'Angle de voile:',
                de: 'Segelwinkel:',
                it: 'Angolo della vela:',
              })} {pos.sailAngle}°
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card p-4">
          <div className="text-xs font-medium tracking-wider mb-2"
               style={{ color: COLORS.textMuted }}>
            {tp('ОПИСАНИЕ / DESCRIPTION', 'DESCRIPTION', 'OPIS / DESCRIPTION')}
          </div>
          <p className="text-sm leading-relaxed mb-2" style={{ color: COLORS.textPrimary }}>
            {legacyPick(pos, 'description', lang)}
          </p>
          {lang !== 'en' && (
            <p className="text-xs leading-relaxed" style={{ color: COLORS.textSecondary }}>
              {pos.descriptionEn}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="card p-4">
          <div className="text-xs font-medium tracking-wider mb-3"
               style={{ color: COLORS.textMuted }}>
            {tp('УПРАВЛЕНИЕ / CONTROLS', 'CONTROLS', 'STEROWANIE / CONTROLS')}
          </div>

          {/* Rotation slider */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: COLORS.textSecondary }}>
                {tp('Курс яхты / Boat heading', 'Boat heading', 'Kurs jachtu / Boat heading')}
              </span>
              <span className="text-xs font-mono font-bold" style={{ color: COLORS.accentCyan }}>
                {Math.round(boatAngle)}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              step="1"
              value={boatAngle}
              onChange={onSliderChange}
              aria-label={tp('Курс яхты', 'Boat heading', 'Kurs jachtu')}
              className="w-full accent-[#00d4ff]"
              style={{ accentColor: COLORS.accentCyan }}
            />
            <div className="flex justify-between text-xs" style={{ color: COLORS.textMuted }}>
              <span>0°</span>
              <span>90°</span>
              <span>180°</span>
              <span>270°</span>
              <span>360°</span>
            </div>
          </div>

          {/* Wind direction slider */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: COLORS.textSecondary }}>
                {tp('Откуда дует ветер / Wind from', 'Wind from', 'Kierunek wiatru / Wind from')}
              </span>
              <span className="text-xs font-mono font-bold" style={{ color: COLORS.accentCyan }}>
                {Math.round(windDir)}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              step="1"
              value={windDir}
              onChange={(e) => setWindDir(Number(e.target.value))}
              aria-label={tp('Направление ветра', 'Wind direction', 'Kierunek wiatru')}
              className="w-full"
              style={{ accentColor: COLORS.accentCyan }}
            />
            <div className="flex justify-between text-xs" style={{ color: COLORS.textMuted }}>
              <span>N</span>
              <span>E</span>
              <span>S</span>
              <span>W</span>
              <span>N</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onReset}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
              style={{
                background: 'rgba(0, 212, 255, 0.12)',
                color: COLORS.accentCyan,
                border: '1px solid rgba(0, 212, 255, 0.2)',
              }}
            >
              {tp('Сброс (90°)', 'Reset (90°)', 'Reset (90°)', {
                es: 'Reiniciar (90°)',
                fr: 'Reinitialiser (90°)',
                de: 'Zurücksetzen (90°)',
                it: 'Reimposta (90°)',
              })}
            </button>
            <button
              // Head-to-wind = heading equal to the CURRENT wind direction
              // (windDir is a state the user can drag). The old setBoatAngle(0)
              // pointed north, which with the default wind from 180 was a dead
              // run - the exact opposite of "into wind".
              onClick={() => setBoatAngle(windDir)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
              style={{
                background: 'rgba(255, 68, 68, 0.12)',
                color: COLORS.danger,
                border: '1px solid rgba(255, 68, 68, 0.2)',
              }}
            >
              {tp('В левентик', 'Into wind', 'W lewentyk', {
                es: 'Proa al viento',
                fr: 'Face au vent',
                de: 'In den Wind',
                it: 'Prua al vento',
              })}
            </button>
          </div>

          <div className="mt-3 text-xs leading-relaxed" style={{ color: COLORS.textMuted }}>
            {lang === 'ru' && (
              <>Тащи <span style={{ color: COLORS.accentCyan }}>за лодку</span> чтобы её повернуть, или <span style={{ color: COLORS.accentCyan }}>за стрелку ветра</span> чтобы поменять направление ветра. Слайдеры и стрелки клавиатуры тоже работают.</>
            )}
            {lang === 'en' && (
              <>Drag <span style={{ color: COLORS.accentCyan }}>the boat</span> to rotate it, or <span style={{ color: COLORS.accentCyan }}>the wind arrow</span> to change the wind direction. Sliders and arrow keys also work.</>
            )}
            {lang === 'pl' && (
              <>Przeciagnij <span style={{ color: COLORS.accentCyan }}>lodke</span> aby ja obrocic, albo <span style={{ color: COLORS.accentCyan }}>strzalke wiatru</span> aby zmienic kierunek wiatru. Suwaki i strzalki na klawiaturze tez dzialaja.</>
            )}
            {lang === 'es' && (
              <>Arrastra <span style={{ color: COLORS.accentCyan }}>el barco</span> para girarlo, o <span style={{ color: COLORS.accentCyan }}>la flecha del viento</span> para cambiar la direccion del viento. Los deslizadores y las flechas del teclado tambien funcionan.</>
            )}
            {lang === 'fr' && (
              <>Fais glisser <span style={{ color: COLORS.accentCyan }}>le bateau</span> pour le faire pivoter, ou <span style={{ color: COLORS.accentCyan }}>la fleche du vent</span> pour changer la direction du vent. Les curseurs et les fleches du clavier fonctionnent aussi.</>
            )}
            {lang === 'de' && (
              <>Ziehe <span style={{ color: COLORS.accentCyan }}>das Boot</span>, um es zu drehen, oder <span style={{ color: COLORS.accentCyan }}>den Windpfeil</span>, um die Windrichtung zu ändern. Schieberegler und Pfeiltasten funktionieren auch.</>
            )}
            {lang === 'it' && (
              <>Trascina <span style={{ color: COLORS.accentCyan }}>la barca</span> per ruotarla, o <span style={{ color: COLORS.accentCyan }}>la freccia del vento</span> per cambiare la direzione del vento. Funzionano anche i cursori e i tasti freccia.</>
            )}
          </div>
        </div>

        {/* Point of Sail Legend */}
        <div className="card p-4">
          <div className="text-xs font-medium tracking-wider mb-3"
               style={{ color: COLORS.textMuted }}>
            {tp('КУРСЫ / COURSES', 'COURSES', 'KURSY / COURSES')}
          </div>
          <div className="flex flex-col gap-1.5">
            {pointsOfSail.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-2 py-1 rounded-md transition-colors"
                style={{
                  background: pos.id === p.id ? p.color + '15' : 'transparent',
                  borderLeft: pos.id === p.id ? `3px solid ${p.color}` : '3px solid transparent',
                }}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                <div className="flex-1">
                  <span className="text-xs font-medium" style={{ color: pos.id === p.id ? p.color : COLORS.textPrimary }}>
                    {legacyPick(p, 'name', lang)}
                  </span>
                  <span className="text-xs ml-2" style={{ color: COLORS.textMuted }}>
                    {p.angleMin}°-{p.angleMax}°
                  </span>
                </div>
                <span className="text-xs font-mono" style={{ color: COLORS.textMuted }}>
                  {(p.speedFactor * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ---- Hull drawing helper ----
function drawHull(
  ctx: CanvasRenderingContext2D,
  length: number,
  width: number,
  offsetX: number,
  offsetY: number,
) {
  const bow = -length * 0.5 + offsetY;
  const stern = length * 0.5 + offsetY;
  const midY = offsetY;
  const halfW = width + offsetX;

  // Start at bow (pointed)
  ctx.moveTo(offsetX, bow);
  // Port side curve (left when looking from stern)
  ctx.bezierCurveTo(
    -halfW * 0.3 + offsetX, bow + length * 0.15,  // control 1 near bow
    -halfW + offsetX, midY - length * 0.1,           // control 2 widest point
    -halfW * 0.9 + offsetX, midY + length * 0.15,   // widest aft point
  );
  // Stern port side
  ctx.bezierCurveTo(
    -halfW * 0.85 + offsetX, stern - length * 0.15,
    -halfW * 0.5 + offsetX, stern - length * 0.05,
    offsetX, stern,  // stern center (slightly rounded)
  );
  // Stern starboard side (mirror)
  ctx.bezierCurveTo(
    halfW * 0.5 + offsetX, stern - length * 0.05,
    halfW * 0.85 + offsetX, stern - length * 0.15,
    halfW * 0.9 + offsetX, midY + length * 0.15,
  );
  // Starboard side curve back to bow
  ctx.bezierCurveTo(
    halfW + offsetX, midY - length * 0.1,
    halfW * 0.3 + offsetX, bow + length * 0.15,
    offsetX, bow,
  );
  ctx.closePath();
}
