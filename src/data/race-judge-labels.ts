// The training judge's item names (one per incident kind) and the start
// crowd label, in 7 languages. Split out of race-judge-copy.ts (M4-3) so the
// replay's event ribbon can name judge items without pulling the whole
// debrief copy into the light shared replay route /r/<code>.
// race-judge-copy.ts uses these same objects as raceJudgeCopy.kind and .jostle.

import type { Lang } from "@/lib/languages";
import type { RaceJudgeIncidentKind } from "@/lib/race-judge";

export type JudgeText = Record<Lang, string>;
const w = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): JudgeText => ({ ru, en, pl, es, fr, de, it });

export const raceJudgeKindLabels = {
  "early-start": w("Ранний старт", "Early start", "Falstart", "Salida anticipada", "Départ prématuré", "Frühstart", "Partenza anticipata"),
  "start-clear": w("Чистый старт", "Clean start", "Czysty start", "Salida limpia", "Départ propre", "Sauberer Start", "Partenza pulita"),
  "give-way": w("Нужно было уступить", "You had to keep clear", "Trzeba było ustąpić drogi", "Debías mantenerte separado", "Tu devais te maintenir à l'écart", "Du musstest dich freihalten", "Dovevi tenerti discosto"),
  "avoid-contact": w("Опасное сближение", "Close approach", "Niebezpieczne zbliżenie", "Aproximación peligrosa", "Rapprochement dangereux", "Gefährliche Annäherung", "Avvicinamento pericoloso"),
  contact: w("Столкновение", "Contact", "Kontakt", "Contacto", "Contact", "Kontakt", "Contatto"),
  "mark-touch": w("Касание знака", "Mark touched", "Dotknięcie znaku", "Baliza tocada", "Bouée touchée", "Bahnmarke berührt", "Boa toccata"),
  "wrong-rounding": w("Знак пройден неверно", "Wrong rounding", "Błędne okrążenie znaku", "Paso incorrecto de la baliza", "Bouée mal contournée", "Bahnmarke falsch gerundet", "Boa girata in modo errato"),
} satisfies Record<RaceJudgeIncidentKind, JudgeText>;

export const raceJudgeJostleLabel = w("Толкотня на старте", "Crowd at the start", "Tłok na starcie", "Aglomeración en la salida", "Bousculade au départ", "Gedränge am Start", "Ressa alla partenza");
