import type { SrcQuestion } from "@/data/src-radio";
import type { Lang } from "@/lib/languages";
import { ENGLISH_EXPLANATIONS } from "./englishExercises";

/** These 60 items assess English maritime phrasing, including wrong grammar. */
export function hasEnglishOptions(question: Pick<SrcQuestion, "id">): boolean {
  return /^src-1-(?:11[5-9]|1[2-6]\d|17[0-4])$/.test(question.id);
}

export function examOptionText<T extends string | undefined>(question: Pick<SrcQuestion, "id">, option: T, translate: (text: T) => T): T {
  return hasEnglishOptions(question) ? option : translate(option);
}

const clozeHints: Readonly<Record<string, { source: string; values: Record<Lang, string> }>> = {
  "src-1-132": { source: "dobrze", values: { ru: "хорошо", en: "well", pl: "dobrze", es: "bien", fr: "bien", de: "gut", it: "bene" } },
  "src-1-134": { source: "odbierasz mnie", values: { ru: "меня принимаешь", en: "receive me", pl: "odbierasz mnie", es: "me recibes", fr: "me recevez", de: "mich empfangen", it: "mi ricevi" } },
  "src-1-135": { source: "po zalaniu", values: { ru: "после затопления", en: "after flooding", pl: "po zalaniu", es: "tras la inundación", fr: "après envahissement par l'eau", de: "nach Wassereinbruch", it: "dopo l'allagamento" } },
};

export function examQuestionText(question: Pick<SrcQuestion, "id" | "q">, lang: Lang, translate: (text: string) => string): string {
  const cloze = clozeHints[question.id];
  return cloze ? question.q.replace(cloze.source, cloze.values[lang]) : translate(question.q);
}

export function examExplanationText(question: Pick<SrcQuestion, "id" | "whyPl">, translate: (text: string) => string): string {
  const protectedText = ENGLISH_EXPLANATIONS[question.id];
  if (!protectedText) return translate(question.whyPl);
  return translate(protectedText.pl).replace(/\{(radioTerm\d+)\}/g, (whole, key: string) => protectedText.terms[key] ?? whole);
}
