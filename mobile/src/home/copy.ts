import { words, type Label } from "../../../src/lib/product/catalog";

/**
 * Strings of the v3 native Home that the shared catalog and web copy do not
 * have. Counts use the "Label: N" form so no language needs plural rules.
 */
export const homeCopy = {
  brand: "WEEK TO REGATTA",
  nextLesson: words("Следующий урок", "Next lesson", "Następna lekcja", "Siguiente lección", "Leçon suivante", "Nächste Lektion", "Prossima lezione"),
  startHere: words("С чего начать", "Start here", "Zacznij tutaj", "Empieza aquí", "Commence ici", "Hier beginnen", "Inizia da qui"),
  courseDone: words("Курс пройден", "Course complete", "Kurs ukończony", "Curso completado", "Cours terminé", "Kurs abgeschlossen", "Corso completato"),
  statLessons: words("Уроки", "Lessons", "Lekcje", "Lecciones", "Leçons", "Lektionen", "Lezioni"),
  statSails: words("Паруса", "Sails", "Żagle", "Velas", "Voiles", "Segel", "Vele"),
  statRaces: words("Гонки", "Races", "Regaty", "Regatas", "Courses", "Rennen", "Regate"),
  paths: words("Направления", "Learning paths", "Ścieżki nauki", "Itinerarios", "Parcours", "Lernwege", "Percorsi"),
  allCourses: words("Все курсы", "All courses", "Wszystkie kursy", "Todos los cursos", "Tous les cours", "Alle Kurse", "Tutti i corsi"),
  exams: words("Экзамены в Польше", "Exams in Poland", "Egzaminy w Polsce", "Exámenes en Polonia", "Examens en Pologne", "Prüfungen in Polen", "Esami in Polonia"),
  more: words("Ещё", "More", "Więcej", "Más", "Plus", "Mehr", "Altro"),
  photoCredit: words("Фото: регаты Week to Regatta", "Photos: Week to Regatta races", "Zdjęcia: regaty Week to Regatta", "Fotos: regatas Week to Regatta", "Photos : régates Week to Regatta", "Fotos: Week-to-Regatta-Rennen", "Foto: regate Week to Regatta"),
};

export const lessonOf = (n: number, total: number): Label => words(
  `Урок ${n} из ${total}`, `Lesson ${n} of ${total}`, `Lekcja ${n} z ${total}`, `Lección ${n} de ${total}`,
  `Leçon ${n} sur ${total}`, `Lektion ${n} von ${total}`, `Lezione ${n} di ${total}`,
);

export const lessonsCount = (n: number): Label => words(
  `Уроков: ${n}`, `Lessons: ${n}`, `Lekcje: ${n}`, `Lecciones: ${n}`, `Leçons : ${n}`, `Lektionen: ${n}`, `Lezioni: ${n}`,
);

export const doneCount = (n: number): Label => words(
  `пройдено: ${n}`, `done: ${n}`, `ukończone: ${n}`, `completadas: ${n}`, `terminées : ${n}`, `erledigt: ${n}`, `completate: ${n}`,
);

export const scenariosCount = (n: number): Label => words(
  `Ситуаций: ${n}`, `Scenarios: ${n}`, `Sytuacje: ${n}`, `Situaciones: ${n}`, `Situations : ${n}`, `Situationen: ${n}`, `Situazioni: ${n}`,
);
