'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { sharedReplay, type SharedReplay } from "@/lib/race-replay";
import { RaceReplay } from "@/app/game/RaceReplay";
import { trackRaceReplay } from "@/lib/funnel";

export default function ReplayViewer() {
  const { tp } = useI18n();
  const params = useParams();
  const router = useRouter();
  const rawCode = Array.isArray(params?.code) ? params.code[0] : params?.code;
  const code = typeof rawCode === "string" ? rawCode.toUpperCase() : "";
  const [data, setData] = useState<SharedReplay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    let cancelled = false;
    if (!code) return;
    fetch(`/api/replay/${encodeURIComponent(code)}`).then(async response => {
      if (!response.ok) throw new Error("replay-unavailable");
      const replay = sharedReplay(await response.json());
      if (!replay) throw new Error("invalid-replay");
      if (!cancelled) { setData(replay); trackRaceReplay("shared"); }
    }).catch(() => { if (!cancelled) setError(code); });
    return () => { cancelled = true; };
  }, [code]);

  if (error === code || !code) return <div className="max-w-lg mx-auto px-4 py-10">
    <Link href="/" className="text-xs text-[var(--text-muted)]">← {tp("Главная", "Home", "Strona główna", { es: "Inicio", fr: "Accueil", de: "Startseite", it: "Home" })}</Link>
    <h1 className="text-2xl font-semibold mt-4 mb-2">{tp("Повтор не найден", "Replay not found", "Nie znaleziono powtórki", { es: "Repetición no encontrada", fr: "Replay introuvable", de: "Replay nicht gefunden", it: "Replay non trovato" })}</h1>
  </div>;
  if (!data || data.code !== code) return <div className="min-h-[50vh] flex items-center justify-center text-sm text-[var(--text-muted)]">{tp("Загружаю...", "Loading...", "Ładowanie...", { es: "Cargando...", fr: "Chargement...", de: "Wird geladen...", it: "Caricamento..." })}</div>;

  const date = new Date(data.ts).toISOString().slice(0, 16).replace("T", " ");
  const result = data.finishTimeSec === null ? null : data.finishTimeSec + data.metadata.penaltySeconds;
  return <div className="flex flex-col min-h-0 overflow-hidden" style={{ height: "calc(100dvh - var(--site-nav-h, 56px))" }}>
    <div className="shrink-0 px-4 py-3 border-b border-[var(--border)]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-sm font-semibold min-w-0 truncate">{tp("Повтор", "Replay", "Powtórka", { es: "Repetición", fr: "Replay", de: "Replay", it: "Replay" })}{data.nickname ? ` · ${data.nickname}` : ""} · <span className="font-mono text-[var(--accent-cyan)]">{data.code}</span></h1>
        <button type="button" onClick={() => { void navigator.clipboard?.writeText(window.location.href).catch(() => {}); }} className="shrink-0 min-h-11 text-xs text-[var(--accent-cyan)]">{tp("Копировать ссылку", "Copy link", "Kopiuj link", { es: "Copiar enlace", fr: "Copier le lien", de: "Link kopieren", it: "Copia link" })}</button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
        <span>{date} · {data.metadata.mode === "pro" ? "Pro" : tp("Обычный", "Simple", "Prosty", { es: "Sencillo", fr: "Simple", de: "Einfach", it: "Semplice" })}</span>
        {result !== null && <span>{tp("Результат", "Result", "Wynik", { es: "Resultado", fr: "Résultat", de: "Ergebnis", it: "Risultato" })} {formatTime(result)}{data.metadata.penaltySeconds ? ` (+${data.metadata.penaltySeconds} s)` : ""}</span>}
        <div className="flex items-center gap-1" role="group" aria-label={tp("Скорость повтора", "Playback speed", "Prędkość odtwarzania", { es: "Velocidad de reproducción", fr: "Vitesse de lecture", de: "Wiedergabegeschwindigkeit", it: "Velocità di riproduzione" })}>
          {[.5, 1, 2, 4].map(rate => <button type="button" key={rate} aria-pressed={speed === rate} onClick={() => setSpeed(rate)} className="min-h-11 min-w-11 rounded px-1" style={{ color: speed === rate ? "var(--accent-cyan)" : undefined }}>{rate}×</button>)}
        </div>
      </div>
    </div>
    <div className="relative min-h-0 flex-1" data-testid="shared-replay-3d">
      <RaceReplay key={data.code} samples={data.samples} course={data.course} playbackRate={speed} onClose={() => router.push("/game")} />
    </div>
  </div>;
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}.${Math.floor(seconds * 10 % 10)}`;
}
