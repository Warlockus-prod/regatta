'use client';

import { PodSlider, type TpFn } from "../shared";
import type { MainTrimCommand, MainTrimState } from "../../../sailing-lab/rig/main-trim";
import { vangSpanFromPercent, vangSpanPercent, VANG_LIMITS } from "../../../sailing-lab/rig/vang";
import { outhaulDepthFactor } from "../../../../lib/sailing-physics/mainsail-shape";

export function ShapeTrimControls({ rig, target, put, locked, tp }: {
  rig: MainTrimState; target: MainTrimCommand; put: (key: keyof MainTrimCommand, value: number) => void;
  locked: boolean; tp: TpFn;
}) {
  const title = tp("Оттяжка гика и глубина грота", "Vang and mainsail depth", "Obciągacz i głębokość grota", { es: "Contra y profundidad", fr: "Hale-bas et creux", de: "Niederholer und Segeltiefe", it: "Vang e profondità" });
  return <details className="text-sm text-[var(--text-primary)]" data-testid="shape-trim-controls">
    <summary className="flex min-h-11 cursor-pointer items-center">{title}</summary>
    {locked && <p className="mb-3 text-xs text-[var(--warning)]">{tp("В этом эксперименте оттяжка свободна, outhaul в середине. Закрой эксперимент, чтобы менять их отдельно.", "This experiment keeps the vang eased and outhaul centered. Close the experiment to adjust them separately.", "W tym ćwiczeniu obciągacz jest luźny, outhaul pośrodku. Zamknij ćwiczenie, aby je regulować.", { es: "Aquí la contra queda floja y el pajarín al medio. Cierra el experimento para ajustarlos.", fr: "Ici le hale-bas reste mou et la bordure au milieu. Ferme l'expérience pour les régler.", de: "Hier bleiben Niederholer lose und Unterliek mittig. Beende den Versuch zum Verstellen.", it: "Qui vang lasco e base a metà. Chiudi l'esperimento per regolarli." })}</p>}
    <fieldset disabled={locked} className="space-y-4 disabled:opacity-60">
      <PodSlider comfortable label={tp("Оттяжка: расстояние между блоками", "Vang: permitted block separation", "Obciągacz: odstęp bloków", { es: "Contra: separación permitida", fr: "Hale-bas : écart permis", de: "Niederholer: erlaubter Blockabstand", it: "Vang: distanza consentita" })}
        value={`${(target.vangSpan ?? VANG_LIMITS.max).toFixed(2)} m`} min={0} max={100} step={1}
        sliderValue={vangSpanPercent(target.vangSpan ?? VANG_LIMITS.max)} onChange={v => put("vangSpan", vangSpanFromPercent(v))} />
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{tp("Короче: ограничить подъем гика. Длиннее: разрешить подъем под нагрузкой, не поднять принудительно. Мягкая оттяжка не поддерживает гик снизу. Здесь нижняя поддержка учебная и фиксированная.", "Shorter limits boom rise. Longer permits rise under load; it does not push the boom up. A soft vang does not support the boom from below. This model has a fixed teaching support.", "Krócej ogranicza unoszenie. Dłużej pozwala na nie pod obciążeniem, ale nie podnosi bomu. Miękki obciągacz nie podpiera bomu. Model ma stałe podparcie szkoleniowe.", { es: "Acortar limita la subida. Alargar la permite bajo carga, no eleva la botavara. Una contra blanda no sostiene desde abajo. Aquí hay un soporte fijo didáctico.", fr: "Raccourcir limite la montée. Allonger la permet sous charge, sans soulever la bôme. Un hale-bas souple ne la soutient pas. Le support inférieur est fixe ici.", de: "Kürzer begrenzt das Steigen. Länger erlaubt es unter Last, hebt den Baum aber nicht. Ein weicher Niederholer trägt ihn nicht. Hier gibt es eine feste Lernstütze.", it: "Accorciare limita la salita. Allungare la permette sotto carico, non solleva il boma. Un vang morbido non lo sostiene. Qui il supporto inferiore è fisso." })}</p>
      <PodSlider comfortable label={tp("Outhaul: выбрать 0%, потравить 100%", "Outhaul: hauled 0%, eased 100%", "Outhaul: wybrany 0%, luźny 100%", { es: "Pajarín: cazado 0%, lascado 100%", fr: "Bordure : étarquée 0%, lâchée 100%", de: "Unterliek: dicht 0%, lose 100%", it: "Base: cazzata 0%, lasca 100%" })}
        value={`${Math.round((target.outhaulEase ?? .5) * 100)}%`} min={0} max={1} step={.05}
        sliderValue={target.outhaulEase ?? .5} onChange={v => put("outhaulEase", v)} />
    </fieldset>
    <svg viewBox="0 0 320 145" role="img" aria-label={title} className="mt-3 w-full">
      {[.2, .4, .7].map((height, i) => {
        const y = 24 + i * 43, width = 224, depth = width * .128 * (.65 + .35 * Math.sin(Math.PI * height)) * outhaulDepthFactor(rig.command.outhaulEase, height);
        const points = Array.from({ length: 41 }, (_, j) => {
          const u = j / 40, profile = u <= .45 ? 1 - ((u - .45) / .45) ** 2 : 1 - ((u - .45) / .55) ** 2;
          return `${64 + u * width},${y + profile * depth}`;
        }).join(" ");
        return <g key={height}><text x="2" y={y + 4} fill="var(--text-secondary)" fontSize="12">{height * 100}%</text>
          <path d={`M64 ${y} H288`} stroke="var(--text-secondary)" strokeDasharray="3 4" />
          <polyline points={points} stroke="var(--accent-cyan)" strokeWidth="2" fill="none" /></g>;
      })}
    </svg>
    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{tp("Сечения на 20%, 40% и 70% высоты, без масштаба хорды. Outhaul меняет преимущественно низ, twist разворачивает сечения. Глубина влияет на силы, но полнее не всегда быстрее. В этой модели углы паруса закреплены, ход шкотового угла и нагрузка в тросе еще не рассчитаны.", "Sections at 20%, 40% and 70% height, with equal display chords. Outhaul mainly changes the lower sail; twist rotates sections. Depth affects forces, but fuller is not always faster. Sail corners are fixed in this model; clew travel and rope loads are not yet solved.", "Przekroje na 20%, 40% i 70% wysokości, o równej cięciwie na rysunku. Outhaul zmienia głównie dół; skręt obraca przekroje. Głębokość wpływa na siły, lecz pełniej nie zawsze znaczy szybciej. Rogi są tu stałe; ruch rogu i obciążenia liny nie są obliczane.", { es: "Secciones al 20%, 40% y 70% de altura, con cuerdas iguales en el dibujo. El pajarín cambia sobre todo la parte baja; el twist gira secciones. La profundidad afecta las fuerzas, pero más bolsa no siempre da velocidad. Puños fijos; recorrido y cargas aún sin calcular.", fr: "Coupes à 20%, 40% et 70% de hauteur, cordes égales à l'écran. La bordure change surtout le bas ; le vrillage tourne les coupes. Le creux agit sur les forces, mais plus creux n'est pas toujours plus rapide. Points fixes ; déplacement du point d'écoute et charges non calculés.", de: "Schnitte bei 20%, 40% und 70% Höhe, mit gleicher Sehnenlänge im Bild. Das Unterliek verändert vor allem den unteren Teil; Twist dreht die Schnitte. Tiefe beeinflusst Kräfte, voller ist nicht immer schneller. Segelecken sind fest; Schothornweg und Leinenlasten noch nicht berechnet.", it: "Sezioni al 20%, 40% e 70% dell'altezza, con corde uguali nel disegno. La base cambia soprattutto la parte bassa; il twist ruota le sezioni. La profondità cambia le forze, ma più grasso non è sempre più veloce. Angoli fissi; spostamento della bugna e carichi non ancora calcolati." })}</p>
  </details>;
}
