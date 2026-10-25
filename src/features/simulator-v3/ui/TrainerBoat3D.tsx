'use client';

import { useEffect, useRef } from "react";
import { RegattaScene } from "../../simulator-3d/RegattaScene";
import { yachtFromSession } from "../../sailing-lab/runtime/presentation";
import type { CameraView } from "../../simulator-3d/camera";
import type { SimulationModel, TpFn } from "./shared";
import { useVenue } from "../../venues/useVenue";

/** View only. The parent Trainer continues to own the ONE session clock. */
export default function TrainerBoat3D({ sim, tp, view }: { sim: SimulationModel; tp: TpFn; view: CameraView }) {
  const yachtRef = useRef(yachtFromSession(sim.session));
  const { venue } = useVenue();
  const activeView = view === "mainsheet" && !sim.session.mainTrim ? "sails" : view;
  useEffect(() => { Object.assign(yachtRef.current, yachtFromSession(sim.session)); }, [sim.session]);
  return <div className="absolute inset-0" data-testid="trainer-boat-3d">
    <RegattaScene stateRef={yachtRef} maxDpr={1} postFx={false} view={activeView} showFlow={activeView !== "mainsheet"} venue={venue}
      sceneLabel="3D"
      loadingLabel={tp("Загрузка яхты", "Loading yacht", "Ładowanie jachtu", { es: "Cargando yate", fr: "Chargement du bateau", de: "Yacht wird geladen", it: "Caricamento della barca" })}
      errorLabel={tp("3D недоступно. Можно продолжить в виде «Сверху» без сброса упражнения.", "3D is unavailable. Continue in Top view without resetting the exercise.", "3D jest niedostępne. Wróć do widoku z góry bez resetowania ćwiczenia.", { es: "3D no disponible. Puedes seguir en la vista \"Cenital\" sin reiniciar el ejercicio.", fr: "La 3D est indisponible. Continue en vue \"Dessus\" sans réinitialiser l'exercice.", de: "3D nicht verfügbar. In der Draufsicht ohne Neustart fortfahren.", it: "3D non disponibile. Continua dall'alto senza ricominciare." })}
      retryLabel={tp("Повторить", "Retry", "Ponów", { es: "Reintentar", fr: "Réessayer", de: "Erneut versuchen", it: "Riprova" })} />
  </div>;
}
