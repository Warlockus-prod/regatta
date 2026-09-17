'use client';

import { useEffect, useRef, useState } from "react";
import { RegattaScene } from "../../simulator-3d/RegattaScene";
import { yachtFromSession } from "../../sailing-lab/runtime/presentation";
import type { CameraView } from "../../simulator-3d/camera";
import type { SimulationModel, TpFn } from "./shared";

/** View only. The parent Trainer continues to own the ONE session clock. */
export default function TrainerBoat3D({ sim, tp }: { sim: SimulationModel; tp: TpFn }) {
  const yachtRef = useRef(yachtFromSession(sim.session));
  const [view, setView] = useState<CameraView>("sails");
  const activeView = view === "mainsheet" && !sim.session.mainTrim ? "sails" : view;
  useEffect(() => { Object.assign(yachtRef.current, yachtFromSession(sim.session)); }, [sim.session]);
  const views: { id: CameraView; title: string }[] = [
    { id: "sails", title: tp("Паруса", "Sails", "Żagle", { es: "Velas", fr: "Voiles", de: "Segel", it: "Vele" }) },
    { id: "deck", title: tp("Палуба", "Deck", "Pokład", { es: "Cubierta", fr: "Pont", de: "Deck", it: "Coperta" }) },
    { id: "whole", title: tp("Вся яхта", "Whole yacht", "Cały jacht", { es: "Yate completo", fr: "Tout le bateau", de: "Ganze Yacht", it: "Intera barca" }) },
  ];
  if (sim.session.mainTrim) views.push({ id: "mainsheet", title: tp("Гротшкот", "Mainsheet", "Szot grota", { es: "Escota mayor", fr: "Écoute", de: "Großschot", it: "Scotta randa" }) });
  return <div className="absolute inset-0 flex flex-col">
    <div className="relative min-h-0 flex-1">
    <RegattaScene stateRef={yachtRef} maxDpr={1} postFx={false} view={activeView} showFlow={activeView !== "mainsheet"}
      sceneLabel="3D"
      loadingLabel={tp("Загрузка яхты", "Loading yacht", "Ładowanie jachtu", { es: "Cargando yate", fr: "Chargement du bateau", de: "Yacht laden", it: "Caricamento barca" })}
      errorLabel={tp("3D недоступно. Можно продолжить в виде «Сверху» без сброса упражнения.", "3D is unavailable. Continue in Top view without resetting the exercise.", "3D jest niedostępne. Wróć do widoku z góry bez resetowania ćwiczenia.", { es: "3D no disponible. Sigue en vista superior sin reiniciar.", fr: "3D indisponible. Continue en vue de dessus sans réinitialiser.", de: "3D nicht verfügbar. In der Draufsicht ohne Neustart fortfahren.", it: "3D non disponibile. Continua dall'alto senza ricominciare." })}
      retryLabel={tp("Повторить", "Retry", "Ponów", { es: "Reintentar", fr: "Réessayer", de: "Erneut versuchen", it: "Riprova" })} />
    </div>
    <div className="flex shrink-0 flex-wrap gap-2 p-2">
      {views.map(item => <button key={item.id} aria-pressed={activeView === item.id} onClick={() => setView(item.id)}
        className="min-h-11 rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
        style={{ background: "var(--bg-primary)", color: activeView === item.id ? "var(--accent-cyan)" : "var(--text-primary)", borderColor: activeView === item.id ? "var(--accent-cyan)" : "var(--border-subtle)" }}>{item.title}</button>)}
    </div>
  </div>;
}
