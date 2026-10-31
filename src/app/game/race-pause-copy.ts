'use client';

// M1-2 texts of the race status row and the pause sheet. A module of its own,
// so the pinned useRaceCopy field contract (replay-copy.test.ts) stays as it
// is; shared words (Menu, Pause, Resume, Time, Position, Speed) come from
// useRaceCopy.

import { useI18n, type Lang } from "@/lib/i18n";

export const RACE_PAUSE_RESOURCES = {
  restart: { ru: "Заново", en: "Restart", pl: "Od nowa", es: "Reiniciar", fr: "Recommencer", de: "Neu starten", it: "Ricomincia" },
  raceSettings: { ru: "Настройки гонки", en: "Race settings", pl: "Ustawienia wyścigu", es: "Ajustes de la regata", fr: "Réglages de la course", de: "Renneinstellungen", it: "Impostazioni della regata" },
  exit: { ru: "Выйти", en: "Exit", pl: "Wyjdź", es: "Salir", fr: "Quitter", de: "Beenden", it: "Esci" },
  exitQuestion: { ru: "Выйти из гонки?", en: "Leave the race?", pl: "Wyjść z wyścigu?", es: "¿Salir de la regata?", fr: "Quitter la course ?", de: "Rennen verlassen?", it: "Uscire dalla regata?" },
  exitNote: { ru: "Эта гонка не будет засчитана.", en: "This race will not count.", pl: "Ten wyścig nie zostanie zaliczony.", es: "Esta regata no contará.", fr: "Cette course ne comptera pas.", de: "Dieses Rennen wird nicht gewertet.", it: "Questa regata non verrà conteggiata." },
  stay: { ru: "Остаться", en: "Stay", pl: "Zostań", es: "Quedarme", fr: "Rester", de: "Bleiben", it: "Resto" },
  keys: { ru: "Esc или P: пауза", en: "Esc or P: pause", pl: "Esc lub P: pauza", es: "Esc o P: pausa", fr: "Échap ou P : pause", de: "Esc oder P: Pause", it: "Esc o P: pausa" },
  fullscreen: { ru: "Во весь экран", en: "Full screen", pl: "Pełny ekran", es: "Pantalla completa", fr: "Plein écran", de: "Vollbild", it: "Schermo intero" },
  /** Accessible name of the thin row over the scene. */
  status: { ru: "Состояние гонки", en: "Race status", pl: "Stan wyścigu", es: "Estado de la regata", fr: "État de la course", de: "Rennstatus", it: "Stato della regata" },
  place: { ru: "Место", en: "Place", pl: "Miejsce", es: "Puesto", fr: "Place", de: "Platz", it: "Posizione" },
} as const satisfies Record<string, Record<Lang, string>>;

export function useRacePauseCopy() {
  const { tl } = useI18n();
  return {
    restart: tl(RACE_PAUSE_RESOURCES.restart),
    raceSettings: tl(RACE_PAUSE_RESOURCES.raceSettings),
    exit: tl(RACE_PAUSE_RESOURCES.exit),
    exitQuestion: tl(RACE_PAUSE_RESOURCES.exitQuestion),
    exitNote: tl(RACE_PAUSE_RESOURCES.exitNote),
    stay: tl(RACE_PAUSE_RESOURCES.stay),
    keys: tl(RACE_PAUSE_RESOURCES.keys),
    fullscreen: tl(RACE_PAUSE_RESOURCES.fullscreen),
    status: tl(RACE_PAUSE_RESOURCES.status),
    place: tl(RACE_PAUSE_RESOURCES.place),
  };
}
export type RacePauseCopy = ReturnType<typeof useRacePauseCopy>;
