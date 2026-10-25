import type { DiagnosticOutcome } from "./diagnostics";
import { diagnosticTitle } from "./diagnostic-title";
import type { LocalizedText } from "./languages";
export { diagnosticText } from "./diagnostic-title";

export const diagnosticCopy = {
  title: diagnosticTitle,
  intro: { ru: "Команды и результаты на этом устройстве. Тексты передач и личные данные не записываются.", en: "Commands and outcomes on this device. Transmission text and personal data are not recorded.", pl: "Polecenia i wyniki na tym urządzeniu. Treść komunikatów i dane osobowe nie są zapisywane.", es: "Comandos y resultados en este dispositivo. No se guardan mensajes ni datos personales.", fr: "Commandes et résultats sur cet appareil. Le texte des messages et les données personnelles ne sont pas enregistrés.", de: "Befehle und Ergebnisse auf diesem Gerät. Funkspruchtexte und persönliche Daten werden nicht gespeichert.", it: "Comandi ed esiti su questo dispositivo. I testi dei messaggi e i dati personali non vengono registrati." },
  empty: { ru: "Пока нет событий. Выполни действие и вернись к журналу.", en: "No events yet. Try a control and return to the journal.", pl: "Brak zdarzeń. Użyj elementu sterującego i wróć do dziennika.", es: "Aún no hay eventos. Prueba un control y vuelve al registro.", fr: "Aucun événement. Utilisez une commande puis revenez au journal.", de: "Noch keine Ereignisse. Bediene ein Element und öffne das Protokoll erneut.", it: "Nessun evento. Prova un comando e torna al registro." },
  all: { ru: "Все", en: "All", pl: "Wszystkie", es: "Todos", fr: "Tous", de: "Alle", it: "Tutti" },
  failures: { ru: "Ошибки и отказы", en: "Errors and rejections", pl: "Błędy i odrzucenia", es: "Errores y rechazos", fr: "Erreurs et refus", de: "Fehler und Ablehnungen", it: "Errori e rifiuti" },
  clear: { ru: "Очистить журнал", en: "Clear journal", pl: "Wyczyść dziennik", es: "Borrar registro", fr: "Effacer le journal", de: "Protokoll leeren", it: "Svuota registro" },
  copy: { ru: "Копировать журнал", en: "Copy journal", pl: "Kopiuj dziennik", es: "Copiar registro", fr: "Copier le journal", de: "Protokoll kopieren", it: "Copia registro" },
  copied: { ru: "Скопировано", en: "Copied", pl: "Skopiowano", es: "Copiado", fr: "Copié", de: "Kopiert", it: "Copiato" },
  copyFailed: { ru: "Не удалось скопировать", en: "Could not copy", pl: "Nie udało się skopiować", es: "No se pudo copiar", fr: "Copie impossible", de: "Kopieren fehlgeschlagen", it: "Copia non riuscita" },
  dropped: { ru: "Пропущено", en: "Omitted", pl: "Pominięto", es: "Omitidos", fr: "Omis", de: "Ausgelassen", it: "Omissioni" },
  session: { ru: "Сессия", en: "Session", pl: "Sesja", es: "Sesión", fr: "Session", de: "Sitzung", it: "Sessione" },
  scope: { ru: "Журнал этого экрана. Общий журнал приложения доступен в Настройках.", en: "This screen's journal. The complete app journal is in Settings.", pl: "Dziennik tego ekranu. Pełny dziennik aplikacji znajdziesz w ustawieniach.", es: "Registro de esta pantalla. El registro general está en Ajustes.", fr: "Journal de cet écran. Le journal général est dans les réglages.", de: "Protokoll dieses Bildschirms. Das gesamte App-Protokoll steht in den Einstellungen.", it: "Registro di questa schermata. Il registro generale è nelle impostazioni." },
} satisfies Record<string, LocalizedText>;
export const diagnosticOutcomeCopy = {
  accepted: { ru: "Принято", en: "Accepted", pl: "Przyjęto", es: "Aceptado", fr: "Accepté", de: "Angenommen", it: "Accettato" },
  noop: { ru: "Без изменения", en: "Unchanged", pl: "Bez zmiany", es: "Sin cambios", fr: "Inchangé", de: "Unverändert", it: "Invariato" },
  rejected: { ru: "Отклонено", en: "Rejected", pl: "Odrzucono", es: "Rechazado", fr: "Refusé", de: "Abgelehnt", it: "Rifiutato" },
  failed: { ru: "Ошибка", en: "Failed", pl: "Błąd", es: "Error", fr: "Échec", de: "Fehler", it: "Errore" },
} satisfies Record<DiagnosticOutcome, LocalizedText>;
