import type { Lang } from "@/lib/languages";

// The few phonetic drill strings that other radio pages show (course page,
// practice list, theory chapter link). Kept apart from the full drill copy in
// phonetic-copy.ts so those pages do not ship the whole drill interface text.

export const PHONETIC_DRILL_HREF = "/radio/alfabet";
/** The theory chapter that teaches spelling; the drill returns there. */
export const PHONETIC_DRILL_CHAPTER = "routine";

export const PHONETIC_ENTRY_COPY = {
  drillTitle: { ru: "Фонетический алфавит и цифры", en: "Phonetic alphabet and numbers", pl: "Alfabet fonetyczny i cyfry", es: "Alfabeto fonético y números", fr: "Alphabet phonétique et chiffres", de: "Buchstabieralphabet und Zahlen", it: "Alfabeto fonetico e numeri" },
  listNote: { ru: "Буквы, цифры и передача по буквам", en: "Letters, numbers and spelling", pl: "Litery, cyfry i literowanie", es: "Letras, números y deletreo", fr: "Lettres, chiffres et épellation", de: "Buchstaben, Zahlen und Buchstabieren", it: "Lettere, numeri e spelling" },
  chapterLink: { ru: "Отработать фонетический алфавит", en: "Practise the phonetic alphabet", pl: "Przećwicz alfabet fonetyczny", es: "Practica el alfabeto fonético", fr: "S'entraîner à l'alphabet phonétique", de: "Buchstabieralphabet üben", it: "Esercitati con l'alfabeto fonetico" },
} satisfies Record<string, Record<Lang, string>>;
