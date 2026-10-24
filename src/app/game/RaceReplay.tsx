'use client';

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NativeRaceSnapshot } from "@/lib/race-native";
import type { Race3DBoat } from "@/features/race-3d/pose";
import { useVenue } from "@/features/venues/useVenue";
import { useRaceView } from "@/features/race-3d/useRaceView";
import { angleDiff, windAt, raceTrim } from "@/lib/race-physics";
import { useI18n } from "@/lib/i18n";
import { useRaceCopy } from "./race-copy";
import styles from "./RaceCockpit.module.css";

const RaceScene = dynamic(() => import("@/features/race-scene/RaceScene").then(m => m.RaceScene), { ssr: false });

/** Recorded positions in the original course, rendered by the same local scene. */
export function RaceReplay({ samples, course, onClose }: {
  samples: NativeRaceSnapshot["samples"]; course: NativeRaceSnapshot["course"]; onClose: () => void;
}) {
  const { tl, lang } = useI18n();
  const c = useRaceCopy();
  const { venue } = useVenue();
  const { camera, setCamera } = useRaceView();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(samples[0]?.t ?? 0);
  const cursor = useRef(time);
  const total = samples.at(-1)?.t ?? 0;
  const courseRef = useRef(course);
  const windDirRef = useRef(0);
  const boatsRef = useRef<Race3DBoat[]>([]);
  const title = tl({ ru: "Повтор гонки", en: "Race replay", pl: "Powtórka wyścigu", es: "Repetición de regata", fr: "Relecture de la course", de: "Rennwiederholung", it: "Replay della regata" });
  const labels = useMemo(() => ({ metres: lang === "ru" ? "м" : "m", scene: title,
    loading: tl({ ru: "Загружаем яхту", en: "Loading the yacht", pl: "Ładujemy jacht", es: "Cargando el velero", fr: "Chargement du voilier", de: "Yacht wird geladen", it: "Caricamento della barca" }),
    error: tl({ ru: "Не удалось открыть 3D. Повтори загрузку.", en: "Could not open 3D. Retry loading.", pl: "Nie udało się otworzyć 3D. Ponów ładowanie.", es: "No se pudo abrir el 3D. Reintenta la carga.", fr: "Impossible d'ouvrir la 3D. Relance le chargement.", de: "3D konnte nicht geöffnet werden. Erneut laden.", it: "Impossibile aprire il 3D. Riprova il caricamento." }), retry: c.retry }), [tl, lang, title, c.retry]);

  useEffect(() => {
    const at = (t: number) => {
      let lo = 0, hi = Math.max(0, samples.length - 1);
      while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2); if (samples[mid].t <= t) lo = mid; else hi = mid - 1; }
      const a = samples[lo]; if (!a) return;
      const b = samples[Math.min(lo + 1, samples.length - 1)];
      const f = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0;
      windDirRef.current = a.windDir ?? windAt(t).dir;
      boatsRef.current = [{ id: "player", name: title, color: "#00d4ff", isPlayer: true, lapDone: a.lap,
        heading: (a.heading + angleDiff(a.heading, b.heading) * f + 360) % 360,
        speed: a.speed + (b.speed - a.speed) * f, trim: a.trim ? raceTrim(a.trim) : undefined, pos: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f } }];
    };
    at(cursor.current);
    let id = 0, last = 0, lastUi = 0;
    const frame = (now: number) => {
      if (last && playing && !document.hidden) cursor.current = Math.min(total, cursor.current + Math.min(.1, (now - last) / 1000));
      last = now; at(cursor.current);
      if (now - lastUi > 100) { lastUi = now; setTime(cursor.current); }
      if (playing && cursor.current >= total) setPlaying(false);
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [playing, samples, total, title]);

  return <div className={`${styles.cockpit} absolute inset-0`} data-testid="race-replay-3d">
    <header className={styles.toolbar}><button type="button" onClick={onClose}>{c.menu}</button><strong>{title}</strong><button type="button" onClick={() => setCamera(camera === "high" ? "stern" : "high")}>{c.view}</button></header>
    <div className={styles.scene} style={{ flex: 1 }}><RaceScene boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} venue={venue} camera={camera} labels={labels} /></div>
    <div className="px-4 py-3 flex items-center gap-4">
      <button type="button" onClick={() => { if (cursor.current >= total) cursor.current = samples[0]?.t ?? 0; setPlaying(p => !p); }}>{playing ? c.pause : c.resume}</button>
      <input type="range" className="flex-1 min-w-0" aria-label={title} min={samples[0]?.t ?? 0} max={total} step="0.1" value={time} onChange={e => { cursor.current = Number(e.target.value); setTime(cursor.current); }} />
      <output>{Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, "0")}</output>
    </div>
  </div>;
}
