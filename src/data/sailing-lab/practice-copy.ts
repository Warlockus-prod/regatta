import { words } from "../../lib/product/catalog";

/** Shared labels used while returning from or saving a completed practice. Keep this boundary independent of the full lesson framing and goals. */
export const practiceCopy = {
  saved: words("Результат упражнения сохранён на устройстве", "Exercise result saved on this device", "Wynik ćwiczenia zapisany na urządzeniu", "Resultado guardado en este dispositivo", "Résultat enregistré sur cet appareil", "Übungsergebnis auf diesem Gerät gespeichert", "Risultato salvato su questo dispositivo"),
  save: words("Сохранить результат упражнения", "Save exercise result", "Zapisz wynik ćwiczenia", "Guardar resultado", "Enregistrer le résultat", "Übungsergebnis speichern", "Salva il risultato"),
  saving: words("Сохраняем...", "Saving...", "Zapisywanie...", "Guardando...", "Enregistrement...", "Speichern...", "Salvataggio..."),
  saveError: words("Не удалось сохранить. Попробуй ещё раз, пока упражнение открыто.", "Could not save. Try again while the exercise is open.", "Nie udało się zapisać. Spróbuj ponownie przed zamknięciem ćwiczenia.", "No se pudo guardar. Reinténtalo antes de cerrar el ejercicio.", "Enregistrement impossible. Réessaie avant de fermer l'exercice.", "Speichern fehlgeschlagen. Versuche es erneut, solange die Übung offen ist.", "Salvataggio non riuscito. Riprova prima di chiudere l'esercizio."),
  return: words("Вернуться к уроку", "Return to the lesson", "Wróć do lekcji", "Volver a la lección", "Revenir à la leçon", "Zurück zur Lektion", "Torna alla lezione"),
};
