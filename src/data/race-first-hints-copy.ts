import type { Lang } from "@/lib/languages";
import type { FirstRaceHint } from "@/features/race-hud/first-race-hints";

/** Seven-language copy of the first race hints (M4-7,
 * src/features/race-hud/first-race-hints.ts) and of their settings entry.
 * Each hint is one situation and the general way out, short enough for the
 * toast stack near the boat. Terms follow scripts/sailing-glossary.md
 * (no-go zone, tack, windward mark, port/starboard tack, right of way, keep
 * clear). No heading, distance or sheet setting: the hints do not steer, so
 * they do not take gold off a race (decision #8, see first-race-hints.ts).
 * The crossing hint follows rule 10 as the judge applies it (race-rules.ts):
 * port tack keeps clear of starboard tack; the stand-on boat still avoids
 * contact (rule 14). */
export type HintText = Record<Lang, string>;
const w = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): HintText => ({ ru, en, pl, es, fr, de, it });

export const FIRST_RACE_HINT_COPY = {
  "no-go": w(
    "Мертвая зона: прямо против ветра паруса не тянут. Отверни нос от ветра, чтобы набрать ход.",
    "No-go zone: the sails can't drive you straight into the wind. Bear away to pick up speed.",
    "Kąt martwy: pod sam wiatr żagle nie pracują. Odpadnij, żeby nabrać prędkości.",
    "Zona muerta: contra el viento las velas no empujan. Arriba, apartando la proa del viento, para coger velocidad.",
    "Zone morte : face au vent, les voiles ne portent pas. Abats pour reprendre de la vitesse.",
    "Toter Winkel: direkt gegen den Wind ziehen die Segel nicht. Fall ab, um Fahrt aufzunehmen.",
    "Angolo morto: controvento le vele non spingono. Poggia per riprendere velocità."),
  "first-tack": w(
    "Это был поворот оверштаг: после него лодка медленная. Дай ей разогнаться, потом приводись.",
    "That was a tack: the boat is slow after it. Let it pick up speed before you head up.",
    "To był zwrot przez sztag: po nim łódź jest wolna. Pozwól jej się rozpędzić, zanim zaczniesz ostrzyć.",
    "Eso fue una virada: después el barco va lento. Deja que acelere antes de orzar.",
    "C'était un virement de bord : ensuite le bateau est lent. Laisse-le accélérer avant de lofer.",
    "Das war eine Wende: danach ist das Boot langsam. Lass es Fahrt aufnehmen, bevor du anluvst.",
    "Era una virata: dopo la barca è lenta. Lasciala accelerare prima di orzare."),
  "mark-approach": w(
    "Верхний знак близко: обогни его, оставив по левому борту, и не задень.",
    "Windward mark ahead: round it leaving it to port, without touching it.",
    "Znak nawietrzny blisko: opłyń go, zostawiając po lewej burcie, i nie dotknij.",
    "Baliza de barlovento cerca: rodéala dejándola a babor, sin tocarla.",
    "Bouée au vent proche : contourne-la en la laissant à bâbord, sans la toucher.",
    "Luvtonne voraus: runde sie und lass sie an Backbord, ohne sie zu berühren.",
    "Boa di bolina vicina: girala lasciandola a sinistra, senza toccarla."),
  crossingGiveWay: w(
    "Лодка на другом галсе. Ты на левом галсе: уступи дорогу, пройди за ее кормой.",
    "A boat on the other tack. You're on port tack: keep clear and pass astern of it.",
    "Łódź na przeciwnym halsie. Jesteś na lewym halsie: ustąp drogi, przejdź za jej rufą.",
    "Un barco en la otra amura. Vas amurado a babor: cede el paso y pasa por su popa.",
    "Un bateau sur l'autre amure. Tu es bâbord amures : écarte-toi et passe derrière lui.",
    "Ein Boot auf dem anderen Bug. Du bist auf Backbordbug: halte dich frei, passiere hinter seinem Heck.",
    "Una barca sulle altre mure. Sei mure a sinistra: tieniti discosto e passale di poppa."),
  crossingStandOn: w(
    "Лодка на другом галсе. Ты на правом галсе: у тебя право дороги, держи курс, но не допусти касания.",
    "A boat on the other tack. You're on starboard tack: you have right of way. Hold your course, but avoid contact.",
    "Łódź na przeciwnym halsie. Jesteś na prawym halsie: masz prawo drogi. Utrzymaj kurs, ale unikaj kontaktu.",
    "Un barco en la otra amura. Vas amurado a estribor: tienes derecho de paso. Mantén el rumbo, pero evita el contacto.",
    "Un bateau sur l'autre amure. Tu es tribord amures : tu as la priorité. Garde ton cap, mais évite le contact.",
    "Ein Boot auf dem anderen Bug. Du bist auf Steuerbordbug: du hast Wegerecht. Halte Kurs, aber vermeide Berührung.",
    "Una barca sulle altre mure. Sei mure a dritta: hai diritto di rotta. Mantieni la rotta, ma evita il contatto."),
  /** The race settings entry ("Show hints again"). */
  again: w("Показать подсказки снова", "Show hints again", "Pokaż wskazówki ponownie", "Mostrar los consejos otra vez",
    "Revoir les conseils", "Hinweise erneut zeigen", "Mostra di nuovo i consigli"),
  againNote: w(
    "Короткие подсказки первой гонки: мертвая зона, поворот, знак и встречная лодка. Каждая один раз, медаль за них не снижается.",
    "Short first race hints: the no-go zone, the tack, the mark and a crossing boat. Each shows once and never costs you a medal.",
    "Krótkie wskazówki pierwszego wyścigu: kąt martwy, zwrot, znak i łódź na przeciwnym halsie. Każda raz i nie odbiera medalu.",
    "Consejos breves de la primera regata: zona muerta, virada, baliza y un barco que cruza. Cada uno sale una vez y no te quita medalla.",
    "Courts conseils de la première course : zone morte, virement, bouée et bateau qui croise. Chacun une fois, sans te coûter de médaille.",
    "Kurze Hinweise im ersten Rennen: toter Winkel, Wende, Bahnmarke und ein kreuzendes Boot. Jeder einmal, er kostet keine Medaille.",
    "Brevi consigli della prima regata: angolo morto, virata, boa e una barca che incrocia. Ognuno una volta, senza toglierti la medaglia."),
  againDone: w("Подсказки покажутся снова.", "The hints will show again.", "Wskazówki pojawią się ponownie.",
    "Los consejos volverán a aparecer.", "Les conseils reviendront.", "Die Hinweise erscheinen wieder.", "I consigli torneranno."),
} as const;

export function firstRaceHintText(lang: Lang, hint: FirstRaceHint): string {
  const copy = hint.id === "crossing" ? FIRST_RACE_HINT_COPY[hint.giveWay ? "crossingGiveWay" : "crossingStandOn"] : FIRST_RACE_HINT_COPY[hint.id];
  return copy[lang];
}
