export const RADIO_FREE_HREF = "/radio/symulator?practice=free";
export const RADIO_GUIDED_HREF = "/radio/obsluga?kurs=1";
export const RADIO_PATHS = ["/radio", "/radio/teoria", "/radio/obsluga", "/radio/symulator", "/radio/test", "/radio/zadania", "/radio/sciaga", "/radio/pozycja", "/radio/rozmowa"] as const;
export interface RadioRoute { path: string; search: string; hash: string; scroll: number }

/** Only installed SRC pages may cross the native navigation boundary. */
export function parseRadioRoute(href: unknown): RadioRoute | null {
  if (typeof href !== "string" || href.length > 700 || !href.startsWith("/") || href.startsWith("//")) return null;
  try {
    const url = new URL(href, "https://offline.weektoregatta.local");
    if (url.origin !== "https://offline.weektoregatta.local" || !(RADIO_PATHS as readonly string[]).includes(url.pathname) || url.search.length > 500 || url.hash.length > 150) return null;
    return { path: url.pathname, search: url.search, hash: url.hash, scroll: 0 };
  } catch { return null; }
}
export const radioHref = (route: RadioRoute) => `${route.path}${route.search}${route.hash}`;
export function initialRadioHref(params: Record<string, unknown> = {}): string {
  return params.view === "course" ? "/radio" : RADIO_FREE_HREF;
}
export function pushRadioRoute(history: readonly RadioRoute[], href: string, scroll = 0): RadioRoute[] {
  const next = parseRadioRoute(href);
  if (!next) return [...history];
  if (!history.length) return [next];
  if (radioHref(history[history.length - 1]) === radioHref(next)) return [...history];
  return [...history.slice(-39, -1), { ...history[history.length - 1], scroll }, next];
}
export function popRadioRoute(history: readonly RadioRoute[]): RadioRoute[] {
  return history.length > 1 ? history.slice(0, -1) : [parseRadioRoute(RADIO_FREE_HREF)!];
}
export function replaceRadioRoute(history: readonly RadioRoute[], href: string): RadioRoute[] {
  const next = parseRadioRoute(href);
  if (!next) return [...history];
  return [...history.slice(0, -1), next];
}

const leaveCopy = {
  title: { ru: "Выйти из пробного экзамена?", en: "Leave the mock exam?", pl: "Wyjść z egzaminu próbnego?", es: "¿Salir del simulacro?", fr: "Quitter l'examen blanc ?", de: "Probeprüfung verlassen?", it: "Uscire dalla simulazione d'esame?" },
  body: { ru: "Ответы текущей попытки будут потеряны. Сохраненный прогресс обучения останется.", en: "Answers for this attempt will be lost. Saved study progress will remain.", pl: "Odpowiedzi z tej próby zostaną utracone. Zapisane postępy w nauce pozostaną.", es: "Se perderán las respuestas de este intento. Se conservará el progreso de estudio guardado.", fr: "Les réponses de cette tentative seront perdues. La progression enregistrée sera conservée.", de: "Die Antworten dieses Versuchs gehen verloren. Gespeicherte Lernfortschritte bleiben erhalten.", it: "Le risposte di questo tentativo andranno perse. I progressi di studio salvati resteranno disponibili." },
  stay: { ru: "Остаться", en: "Stay", pl: "Zostań", es: "Quedarme", fr: "Rester", de: "Bleiben", it: "Resta" },
  leave: { ru: "Выйти", en: "Leave", pl: "Wyjdź", es: "Salir", fr: "Quitter", de: "Verlassen", it: "Esci" },
};
export function radioLeaveCopy(lang: string) {
  const key = Object.hasOwn(leaveCopy.title, lang) ? lang as keyof typeof leaveCopy.title : "en";
  return { title: leaveCopy.title[key], body: leaveCopy.body[key], stay: leaveCopy.stay[key], leave: leaveCopy.leave[key] };
}
type RadioWindow = Window & { __REGATTA_RADIO_ENTRY__?: string; __REGATTA_RADIO_EXAM_DIRTY__?: boolean; __REGATTA_RADIO_LEAVE_APPROVED__?: boolean; ReactNativeWebView?: { postMessage(value: string): void } };
export function postRadioMessage(message: object): void {
  if (typeof window !== "undefined") (window as RadioWindow).ReactNativeWebView?.postMessage(JSON.stringify(message));
}
export function setRadioExamDirty(dirty: boolean): void {
  if (typeof window === "undefined") return;
  (window as RadioWindow).__REGATTA_RADIO_EXAM_DIRTY__ = dirty;
  if (!dirty) (window as RadioWindow).__REGATTA_RADIO_LEAVE_APPROVED__ = false;
  window.dispatchEvent(new CustomEvent("regatta:radio-exam-dirty", { detail: { dirty } }));
  postRadioMessage({ type: "radio-exam-dirty", dirty });
}
export function confirmRadioLeave(): boolean {
  if (typeof window === "undefined" || !(window as RadioWindow).__REGATTA_RADIO_EXAM_DIRTY__) return true;
  const host = window as RadioWindow;
  if (host.__REGATTA_RADIO_LEAVE_APPROVED__) { host.__REGATTA_RADIO_LEAVE_APPROVED__ = false; return true; }
  const lang = document.documentElement.lang;
  const copy = radioLeaveCopy(lang);
  if (!window.confirm([copy.title, copy.body].join("\n\n"))) return false;
  // A captured link and the offline router share this one navigation gesture.
  // Keep the exam protected until it actually unmounts or finishes.
  host.__REGATTA_RADIO_LEAVE_APPROVED__ = true;
  queueMicrotask(() => { host.__REGATTA_RADIO_LEAVE_APPROVED__ = false; });
  return true;
}
export function radioNavigationScript(action: "back" | "navigate", href?: string): string {
  if (action === "navigate" && !parseRadioRoute(href)) throw new Error("Invalid SRC route");
  return `window.dispatchEvent(new CustomEvent("regatta:radio-${action}",{detail:${JSON.stringify({ href })}}));true;`;
}
