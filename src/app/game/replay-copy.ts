'use client';

import { useI18n, type Lang } from "@/lib/i18n";

/** Canonical labels shared with the full racing UI, without its rules copy. */
export const REPLAY_COPY_RESOURCES = {
  view: { ru: "Камера", en: "Camera", pl: "Kamera", es: "Cámara", fr: "Caméra", de: "Kamera", it: "Camera" },
  orbit: { ru: "Вокруг лодки", en: "Around the boat", pl: "Wokół łodzi", es: "Alrededor del barco", fr: "Autour du bateau", de: "Um das Boot", it: "Attorno alla barca" },
  resetCamera: { ru: "Вернуть ракурс", en: "Reset view", pl: "Przywróć widok", es: "Restablecer vista", fr: "Rétablir la vue", de: "Ansicht zurücksetzen", it: "Ripristina vista" },
  high: { ru: "Сверху", en: "Above", pl: "Z góry", es: "Desde arriba", fr: "En hauteur", de: "Von oben", it: "Dall'alto" },
  stern: { ru: "За кормой", en: "Behind", pl: "Za rufą", es: "Tras la popa", fr: "Derrière", de: "Am Heck", it: "Da poppa" },
  pause: { ru: "Пауза", en: "Pause", pl: "Pauza", es: "Pausa", fr: "Pause", de: "Pause", it: "Pausa" },
  resume: { ru: "Продолжить", en: "Resume", pl: "Wznów", es: "Continuar", fr: "Reprendre", de: "Fortsetzen", it: "Riprendi" },
  back: { ru: "Назад", en: "Back", pl: "Wróć", es: "Volver", fr: "Retour", de: "Zurück", it: "Indietro" },
  retry: { ru: "Повторить", en: "Retry", pl: "Ponów", es: "Reintentar", fr: "Réessayer", de: "Erneut versuchen", it: "Riprova" },
} as const satisfies Record<string, Record<Lang, string>>;

export function useReplayCopy() {
  const { tl } = useI18n();
  return {
    view: tl(REPLAY_COPY_RESOURCES.view),
    orbit: tl(REPLAY_COPY_RESOURCES.orbit),
    resetCamera: tl(REPLAY_COPY_RESOURCES.resetCamera),
    high: tl(REPLAY_COPY_RESOURCES.high),
    stern: tl(REPLAY_COPY_RESOURCES.stern),
    pause: tl(REPLAY_COPY_RESOURCES.pause),
    resume: tl(REPLAY_COPY_RESOURCES.resume),
    back: tl(REPLAY_COPY_RESOURCES.back),
    retry: tl(REPLAY_COPY_RESOURCES.retry),
  };
}
