import type { Lang } from "@/lib/languages";

// These shared section headings are UI copy, not original Polish exam text.
export const THEORY_SECTION_LABELS = {
  examSummary: {
    pl: "Sedno na egzamin", ru: "Суть для экзамена", en: "Exam essentials",
    es: "Lo esencial para el examen", fr: "L'essentiel pour l'examen", de: "Das Wesentliche für die Prüfung", it: "Punti essenziali per l'esame",
  },
  distinguishConcepts: {
    pl: "Pojęcia, które trzeba rozróżnić", ru: "Понятия, которые нужно различать", en: "Concepts to distinguish",
    es: "Conceptos que debes distinguir", fr: "Notions à distinguer", de: "Begriffe unterscheiden", it: "Concetti da distinguere",
  },
  questionAreas: {
    pl: "Powiązane obszary banku UKE", ru: "Связанные темы базы UKE", en: "Related UKE question topics",
    es: "Temas relacionados del banco UKE", fr: "Thèmes associés de la banque UKE", de: "Verwandte Themen der UKE-Fragenbank", it: "Argomenti correlati della banca UKE",
  },
  situation: {
    pl: "Sytuacja z życia", ru: "Ситуация из жизни", en: "A real-life situation",
    es: "Una situación real", fr: "Une situation concrète", de: "Eine Situation aus der Praxis", it: "Una situazione reale",
  },
  diagram: {
    pl: "Schemat: zobacz zależność", ru: "Схема: увидь связь", en: "Diagram: see the connection",
    es: "Esquema: observa la relación", fr: "Schéma : comprendre le lien", de: "Schema: den Zusammenhang erkennen", it: "Schema: scopri il collegamento",
  },
  why: {
    pl: "Dlaczego to działa właśnie tak", ru: "Почему это работает именно так", en: "Why it works this way",
    es: "Por qué funciona así", fr: "Pourquoi cela fonctionne ainsi", de: "Warum es so funktioniert", it: "Perché funziona così",
  },
  mentalModel: {
    pl: "Model mentalny", ru: "Ментальная модель", en: "Mental model",
    es: "Modelo mental", fr: "Modèle mental", de: "Denkmodell", it: "Modello mentale",
  },
  procedure: {
    pl: "Procedura krok po kroku", ru: "Процедура по шагам", en: "Step-by-step procedure",
    es: "Procedimiento paso a paso", fr: "Procédure étape par étape", de: "Schrittweise Vorgehensweise", it: "Procedura passo per passo",
  },
  exam: {
    pl: "Na egzaminie UKE", ru: "На экзамене UKE", en: "In the UKE exam",
    es: "En el examen UKE", fr: "À l'examen UKE", de: "In der UKE-Prüfung", it: "All'esame UKE",
  },
  practice: {
    pl: "Na prawdziwym rejsie", ru: "В реальном рейсе", en: "On a real voyage",
    es: "En una travesía real", fr: "En navigation réelle", de: "Auf einem echten Törn", it: "Durante una navigazione reale",
  },
  world: {
    pl: "Europa i świat", ru: "Европа и мир", en: "Europe and the world",
    es: "Europa y el mundo", fr: "L'Europe et le monde", de: "Europa und die Welt", it: "L'Europa e il mondo",
  },
  questionPreview: {
    pl: "Co znajdziesz w pytaniach UKE", ru: "Что встретится в вопросах UKE", en: "What the UKE questions cover",
    es: "Qué incluyen las preguntas UKE", fr: "Ce que couvrent les questions UKE", de: "Was die UKE-Fragen behandeln", it: "Cosa trattano le domande UKE",
  },
} satisfies Record<string, Record<Lang, string>>;

export type TheorySectionId = keyof typeof THEORY_SECTION_LABELS;
