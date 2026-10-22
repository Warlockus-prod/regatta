'use client';

import { useI18n } from "@/lib/i18n";
import { useRaceView } from "./useRaceView";

/** Race menu: see the race as the map (2D) or from the boat (3D). */
export function RaceViewPicker() {
  const { tl } = useI18n();
  const { view3d, setView3d } = useRaceView();
  const options = [
    { on: false, label: tl({ ru: "Карта 2D", en: "Map 2D", pl: "Mapa 2D", es: "Mapa 2D", fr: "Carte 2D", de: "Karte 2D", it: "Mappa 2D" }) },
    { on: true, label: tl({ ru: "С лодки 3D", en: "From the boat 3D", pl: "Z łódki 3D", es: "Desde el barco 3D", fr: "Depuis le bateau 3D", de: "Vom Boot 3D", it: "Dalla barca 3D" }) },
  ];
  const title = tl({ ru: "Вид гонки", en: "Race view", pl: "Widok wyścigu", es: "Vista de la regata", fr: "Vue de la course", de: "Rennansicht", it: "Vista della regata" });
  return (
    <div className="mb-4" data-testid="race-view-picker">
      <div className="mb-2 text-xs font-semibold tracking-wider text-[var(--text-muted)]">{title.toUpperCase()}</div>
      <div className="flex gap-2" role="radiogroup" aria-label={title}>
        {options.map((o) => {
          const active = view3d === o.on;
          return (
            <button
              key={String(o.on)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setView3d(o.on)}
              className="min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
              style={{
                borderColor: active ? "var(--accent-cyan)" : "rgba(139, 167, 184, 0.25)",
                background: active ? "rgba(0, 212, 255, 0.1)" : "transparent",
                color: active ? "var(--accent-cyan)" : "var(--text-primary)",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        {tl({
          ru: "3D показывает ту же гонку с воды: те же соперники, знаки и берег.",
          en: "3D shows the same race from the water: the same rivals, marks and shore.",
          pl: "3D pokazuje ten sam wyścig z wody: ci sami rywale, znaki i brzeg.",
          es: "El 3D muestra la misma regata desde el agua: los mismos rivales, balizas y costa.",
          fr: "La 3D montre la même course depuis l'eau : mêmes adversaires, mêmes bouées, même côte.",
          de: "3D zeigt dasselbe Rennen vom Wasser aus: dieselben Gegner, Tonnen und Küste.",
          it: "Il 3D mostra la stessa regata dall'acqua: gli stessi avversari, boe e costa.",
        })}
      </p>
    </div>
  );
}
