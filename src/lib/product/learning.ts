import { bootcampLessons } from "../../data/bootcamp";
import { sailLessons } from "../../data/sailing-lab/course";
import { readSailProgress } from "../../features/sailing-lab/lessons/progress";
import { destinations, words, type Language } from "./catalog";

export const LEARNING_BOOKMARK_KEY = "regatta.learning.bookmark.v1";
export const learningTracks = ["course", "sails", "radio", "motor"] as const;
export type LearningTrack = typeof learningTracks[number];
export type LearningBookmark = { version: 1; course: LearningTrack; lesson: string | null };
export const homeCopy = {
  title: words("Твоё обучение", "Your learning", "Twoja nauka", "Tu aprendizaje", "Ton apprentissage", "Dein Lernen", "Il tuo apprendimento"),
  intro: words("Вернись к уроку или выбери другое направление.", "Return to a lesson or choose another course.", "Wróć do lekcji lub wybierz inny kurs.", "Vuelve a una lección o elige otro curso.", "Reprends une leçon ou choisis un autre cours.", "Kehre zu einer Lektion zurück oder wähle einen anderen Kurs.", "Riprendi una lezione o scegli un altro corso."),
  choose: words("Другое направление", "Another course", "Inny kurs", "Otro curso", "Un autre cours", "Ein anderer Kurs", "Un altro corso"),
  review: words("Повторить уроки", "Review lessons", "Powtórz lekcje", "Repasar las lecciones", "Revoir les leçons", "Lektionen wiederholen", "Ripassa le lezioni"),
  visited: words("Уроков просмотрено", "Lessons visited", "Odwiedzone lekcje", "Lecciones visitadas", "Leçons consultées", "Besuchte Lektionen", "Lezioni visitate"),
  checked: words("Проверок теории пройдено", "Theory checks passed", "Zaliczone sprawdzenia teorii", "Pruebas teóricas superadas", "Vérifications théoriques réussies", "Bestandene Theorieprüfungen", "Verifiche teoriche superate"),
  courseHome: words("Страница курса", "Course home", "Strona kursu", "Página del curso", "Page du cours", "Kursübersicht", "Pagina del corso"),
  loading: words("Загружаем твой учебный маршрут…", "Loading your learning path…", "Wczytujemy Twój plan nauki…", "Cargando tu itinerario…", "Chargement de ton parcours…", "Dein Lernweg wird geladen…", "Caricamento del tuo percorso…"),
  unavailable: words("Не удалось прочитать сохранённый маршрут. Курсы доступны ниже, прогресс не удалён.", "Could not read your saved path. Courses are available below; no progress was deleted.", "Nie udało się odczytać planu. Kursy są dostępne poniżej; postęp nie został usunięty.", "No se pudo leer tu itinerario. Los cursos están abajo; no se borró el progreso.", "Impossible de lire ton parcours. Les cours restent disponibles ; aucun progrès n'a été supprimé.", "Dein Lernweg konnte nicht gelesen werden. Die Kurse sind unten verfügbar; kein Fortschritt wurde gelöscht.", "Impossibile leggere il percorso. I corsi sono disponibili sotto; nessun progresso è stato cancellato."),
  retry: words("Попробовать ещё раз", "Try again", "Spróbuj ponownie", "Reintentar", "Réessayer", "Erneut versuchen", "Riprova"),
  tools: words("Тренажёры, гонки и справочник находятся в меню.", "Find simulators, races and reference material in Menu.", "Symulatory, regaty i materiały znajdziesz w Menu.", "Encuentra simuladores, regatas y consultas en Menú.", "Retrouve simulateurs, courses et références dans Menu.", "Simulatoren, Rennen und Nachschlagewerke findest du im Menü.", "Trovi simulatori, regate e riferimenti nel Menu."),
};

export function readLearningBookmark(raw: string | null): LearningBookmark | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || value.version !== 1 || !learningTracks.includes(value.course)) return null;
    const lessons = value.course === "course" ? bootcampLessons : value.course === "sails" ? sailLessons : [];
    return { version: 1, course: value.course, lesson: lessons.some(l => l.id === value.lesson) ? value.lesson : null };
  } catch { return null; }
}

/** Record learning entry only, never a grade, and never a user-supplied URL. */
export function bookmarkForPath(path: string, platform: "web" | "native"): LearningBookmark | null {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, "");
  const sail = sailLessons.find(l => clean === `/learn/sails/${l.id}`);
  if (sail) return { version: 1, course: "sails", lesson: sail.id };
  if (platform === "native") {
    const boot = bootcampLessons.find(l => clean === `/bootcamp/${l.id}`);
    if (boot) return { version: 1, course: "course", lesson: boot.id };
  }
  for (const course of ["radio", "motor"] as const) {
    const root = destinations.find(d => d.id === course)![platform]!;
    if (clean === root || clean.startsWith(`${root}/`)) return { version: 1, course, lesson: null };
  }
  return null;
}

export interface LearningSnapshot {
  bookmark: string | null;
  sails: string | null;
  bootcamp: { completed: unknown; current: unknown };
}
export const emptyLearningSnapshot = (): LearningSnapshot => ({ bookmark: null, sails: null, bootcamp: { completed: [], current: null } });

export function homeLearning(snapshot: LearningSnapshot, lang: Language, platform: "web" | "native") {
  const bookmark = readLearningBookmark(snapshot.bookmark);
  const sail = readSailProgress(snapshot.sails);
  const boot = snapshot.bootcamp;
  const viewed = bootcampLessons.filter(l => Array.isArray(boot.completed) && boot.completed.includes(l.id));
  const bootStarted = viewed.length > 0 || bootcampLessons.some(l => l.id === boot.current);
  const sailStarted = sail.checked.length > 0 || Boolean(sail.current);
  const courseId = bookmark?.course ?? (bootStarted ? "course" : sailStarted ? "sails" : "course");
  const course = destinations.find(d => d.id === courseId)!;
  const overview = course[platform]!;
  if (courseId === "radio" || courseId === "motor") {
    return { course, href: overview, overview, title: course.title[lang], detail: course.detail![lang], started: Boolean(bookmark), complete: false, count: null, total: null, metric: null, lessonId: null, minutes: null };
  }
  const isSails = courseId === "sails";
  const lessons = isSails ? sailLessons : bootcampLessons;
  const done = isSails ? sail.checked : viewed.map(l => l.id);
  const current = bookmark?.lesson ?? (isSails ? sail.current : boot.current);
  const next = lessons.find(l => l.id === current && !done.includes(l.id)) ?? lessons.find(l => !done.includes(l.id));
  const complete = !next;
  const lesson = next ?? lessons[0];
  const started = Boolean(bookmark || (isSails ? sailStarted : bootStarted));
  const bootLesson = bootcampLessons.find(l => l.id === lesson.id);
  const sailLesson = sailLessons.find(l => l.id === lesson.id);
  const titles = bootLesson ? { ru: bootLesson.titleRu, en: bootLesson.titleEn, pl: bootLesson.titlePl, es: bootLesson.titleEs, fr: bootLesson.titleFr, de: bootLesson.titleDe, it: bootLesson.titleIt } : null;
  const title = complete ? homeCopy.review[lang] : isSails ? sailLesson!.title[lang] : titles![lang] ?? bootLesson!.titleEn;
  const href = complete ? overview : isSails ? `/learn/sails/${lesson.id}` : platform === "native" ? `/bootcamp/${lesson.id}` : bootLesson!.route;
  return { course, href, overview, title, detail: course.detail![lang], started, complete, count: done.length, total: lessons.length, metric: isSails ? homeCopy.checked[lang] : homeCopy.visited[lang], lessonId: complete ? null : lesson.id, minutes: complete ? null : isSails ? sailLesson!.minutes : bootLesson!.estMinutes };
}
