import { words, type Label } from "../../../src/lib/product/catalog";

/**
 * App-only strings of the v3 Home and Menu that the shared catalog and web
 * copy do not have (the site is not on v3). Counts use "N of TOTAL" with a
 * fixed course total, or the "Label: N" form, so no language needs plural
 * rules.
 */
export const homeCopy = {
  brand: "WEEK TO REGATTA",
  startHere: words("С чего начать", "Start here", "Zacznij tutaj", "Empieza aquí", "Commence ici", "Hier beginnen", "Inizia da qui"),
  lastCourse: words("Последний курс", "Your last course", "Ostatni kurs", "Tu último curso", "Ton dernier cours", "Zuletzt geöffnet", "Ultimo corso"),
  otherPaths: words("Другие направления", "Other paths", "Inne ścieżki", "Otros itinerarios", "Autres parcours", "Weitere Lernwege", "Altri percorsi"),
  allCourses: words("Все курсы", "All courses", "Wszystkie kursy", "Todos los cursos", "Tous les cours", "Alle Kurse", "Tutti i corsi"),
  exams: words("Экзамены в Польше", "Exams in Poland", "Egzaminy w Polsce", "Exámenes en Polonia", "Examens en Pologne", "Prüfungen in Polen", "Esami in Polonia"),
  myProgress: words("Мой прогресс", "My progress", "Mój postęp", "Mi progreso", "Ma progression", "Mein Fortschritt", "I miei progressi"),
  appGroup: words("Приложение", "App", "Aplikacja", "App", "Application", "App", "App"),
  onDevice: words("Хранится на этом устройстве.", "Stored on this device.", "Zapisane na tym urządzeniu.", "Guardado en este dispositivo.", "Enregistré sur cet appareil.", "Auf diesem Gerät gespeichert.", "Salvato su questo dispositivo."),
  photoCredit: words("Фото: регаты Week to Regatta", "Photos: Week to Regatta races", "Zdjęcia: regaty Week to Regatta", "Fotos: regatas Week to Regatta", "Photos : régates Week to Regatta", "Fotos: Week-to-Regatta-Rennen", "Foto: regate Week to Regatta"),
};

export const lessonOf = (n: number, total: number): Label => words(
  `Урок ${n} из ${total}`, `Lesson ${n} of ${total}`, `Lekcja ${n} z ${total}`, `Lección ${n} de ${total}`,
  `Leçon ${n} sur ${total}`, `Lektion ${n} von ${total}`, `Lezione ${n} di ${total}`,
);

/** Lessons passed with evidence (quiz passed or marked done). */
export const passedOf = (n: number, total: number): Label => words(
  `Пройдено ${n} из ${total}`, `Passed ${n} of ${total}`, `Zaliczono ${n} z ${total}`, `Superadas: ${n} de ${total}`,
  `Réussies : ${n} sur ${total}`, `Bestanden: ${n} von ${total}`, `Superate: ${n} di ${total}`,
);

/** Sail course lessons whose theory check was answered correctly. */
export const checkedOf = (n: number, total: number): Label => words(
  `Теория проверена: ${n} из ${total}`, `Theory checked: ${n} of ${total}`, `Teoria sprawdzona: ${n} z ${total}`,
  `Teoría comprobada: ${n} de ${total}`, `Théorie vérifiée : ${n} sur ${total}`, `Theorie geprüft: ${n} von ${total}`,
  `Teoria verificata: ${n} di ${total}`,
);

/** Races kept in this device's history. */
export const racesSaved = (n: number): Label => words(
  `Сохранено гонок: ${n}`, `Races saved: ${n}`, `Zapisane regaty: ${n}`, `Regatas guardadas: ${n}`,
  `Courses enregistrées : ${n}`, `Gespeicherte Rennen: ${n}`, `Regate salvate: ${n}`,
);

export const lessonsCount = (n: number): Label => words(
  `Уроков: ${n}`, `Lessons: ${n}`, `Lekcje: ${n}`, `Lecciones: ${n}`, `Leçons : ${n}`, `Lektionen: ${n}`, `Lezioni: ${n}`,
);

export const scenariosCount = (n: number): Label => words(
  `Ситуаций: ${n}`, `Scenarios: ${n}`, `Sytuacje: ${n}`, `Situaciones: ${n}`, `Situations : ${n}`, `Situationen: ${n}`, `Situazioni: ${n}`,
);
