import { words } from "../lib/product/catalog";

export const foundationCopy = {
  understand: words("Разобраться", "Understand", "Zrozum", "Comprender", "Comprendre", "Verstehen", "Capire"),
  check: words("Проверить себя", "Check yourself", "Sprawdź się", "Comprobar", "Se tester", "Wissen prüfen", "Verificare"),
  practice: words("Практика", "Practice", "Ćwiczenie", "Práctica", "Pratique", "Üben", "Pratica"),
  next: words("Следующий урок", "Next lesson", "Następna lekcja", "Siguiente lección", "Leçon suivante", "Nächste Lektion", "Lezione successiva"),
  outline: words("Программа курса", "Course outline", "Program kursu", "Programa del curso", "Programme du cours", "Kursübersicht", "Programma del corso"),
  return: words("Вернуться к уроку", "Return to lesson", "Wróć do lekcji", "Volver a la lección", "Revenir à la leçon", "Zurück zur Lektion", "Torna alla lezione"),
  savedError: words("Не удалось сохранить. Попробуй еще раз перед выходом.", "Could not save. Try again before leaving.", "Nie udało się zapisać. Spróbuj ponownie przed wyjściem.", "No se pudo guardar. Reinténtalo antes de salir.", "Enregistrement impossible. Réessaie avant de quitter.", "Speichern fehlgeschlagen. Vor dem Verlassen erneut versuchen.", "Salvataggio non riuscito. Riprova prima di uscire."),
  retry: words("Повторить сохранение", "Retry saving", "Ponów zapis", "Reintentar guardar", "Réessayer l'enregistrement", "Erneut speichern", "Riprova il salvataggio"),
  sources: words("Источники", "Sources", "Źródła", "Fuentes", "Sources", "Quellen", "Fonti"),
};

export const foundationModules = [
  { id: "wind", lessons: ["wind-direction", "points-of-sail", "how-sail-works"], title: words("Ветер и движение", "Wind and motion", "Wiatr i ruch", "Viento y movimiento", "Vent et mouvement", "Wind und Bewegung", "Vento e movimento") },
  { id: "turns", lessons: ["tacking", "jibing", "vmg-beating"], title: words("Повороты и путь к цели", "Turns and progress", "Zwroty i droga do celu", "Giros y avance", "Manœuvres et progression", "Manöver und Weg zum Ziel", "Manovre e avanzamento") },
  { id: "race", lessons: ["simple-rules", "mini-race"], title: words("Первая регата", "First regatta", "Pierwsze regaty", "Primera regata", "Première régate", "Erste Regatta", "Prima regata") },
];
