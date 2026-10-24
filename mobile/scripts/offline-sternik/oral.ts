import type { OralPrompt } from "../../../src/app/sternik/ustny/oralPrompts";
import { gradeTurn } from "../../../src/app/radio/rozmowa/dialogueGrading";

/** Same local factual rubric; typed practice never claims to grade speech. */
export function gradeTypedAnswer(prompt: OralPrompt, text: string) {
  return text.trim() && text.length <= 8000 ? gradeTurn(text, prompt.must) : null;
}
