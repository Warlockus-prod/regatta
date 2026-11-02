"use client";

import { useRadioI18n } from "@/app/radio/localization/context";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WeakSpotsPanel from "./WeakSpotsPanel";
import { RADIO_WEAK_AREAS } from "./weakSpots";
import { loadRadioCourseProgress, type RadioCourseProgress } from "./courseProgress";
import { SCENARIO_IDS, SRC_QUESTION_IDS, THEORY_CHAPTER_IDS } from "./courseIds";
import { RADIO_GUIDED_HREF } from "./navigation";
import { PHONETIC_ENTRY_COPY, PHONETIC_DRILL_HREF } from "@/data/radio/phonetic-entry-copy";

const EMPTY_PROGRESS: RadioCourseProgress = {
  theoryCompleted: 0,
  theoryTotal: THEORY_CHAPTER_IDS.length,
  questionsMastered: 0,
  questionsSeen: 0,
  questionsTotal: SRC_QUESTION_IDS.length,
  scenariosPassed: 0,
  scenariosTotal: SCENARIO_IDS.length,
  guideCompleted: 0,
  guideTotal: 15,
  overallPercent: 0,
};

function ProgressLine({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const { rt: radioText } = useRadioI18n();
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span style={{ color: "var(--text-secondary)" }}>{radioText(label)}</span>
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {radioText(value)}/{radioText(total)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-secondary)" }}>
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${percent}%`, background: "var(--success)" }}
        />
      </div>
    </div>
  );
}

export default function RadioCourseHome() {
  const { rt: radioText } = useRadioI18n();
  const { tp, tl } = useRadioI18n();
  const [progress, setProgress] = useState<RadioCourseProgress>(EMPTY_PROGRESS);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProgress(loadRadioCourseProgress());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const next = useMemo(() => {
    if (progress.theoryCompleted < progress.theoryTotal) {
      return {
        href: "/radio/teoria",
        title: tp("Продолжить теорию", "Continue theory", "Kontynuuj teorię"),
        description: tp(
          "Следующая незакрытая глава, схема и проверка из трех вопросов.",
          "The next incomplete chapter, its diagram, and a three-question check.",
          "Następny nieukończony rozdział, schemat i sprawdzenie z trzech pytań.",
        ),
      };
    }
    if (progress.guideCompleted < progress.guideTotal) {
      return {
        href: RADIO_GUIDED_HREF,
        title: tp("Закрепить органы управления", "Master the controls", "Utrwal obsługę"),
        description: tp(
          "Пройди управление ICOM до DISTRESS без поиска кнопок.",
          "Complete the ICOM controls through DISTRESS without hunting for buttons.",
          "Przejdź obsługę ICOM do DISTRESS bez szukania klawiszy.",
        ),
      };
    }
    if (progress.scenariosPassed < progress.scenariosTotal) {
      return {
        href: "/radio/symulator",
        title: tp("Продолжить сценарии", "Continue scenarios", "Kontynuuj scenariusze"),
        description: tp(
          "Отработай процедуру и голос, затем разбери конкретные ошибки.",
          "Practise the procedure and voice call, then review the exact mistakes.",
          "Przećwicz procedurę i głos, potem przejrzyj konkretne błędy.",
        ),
      };
    }
    return {
      href: "/radio/test?mode=exam",
      title: tp("Сдать пробный экзамен", "Take a mock exam", "Zdaj egzamin próbny"),
      description: tp(
        "10 вопросов, по 5 из каждого предмета, затем повтор слабых мест.",
        "10 questions, 5 from each subject, followed by weak-spot review.",
        "10 pytań, po 5 z każdego przedmiotu, potem powtórka słabych punktów.",
      ),
    };
  }, [progress, tp]);

  const path = [
    {
      number: "01",
      title: tp("Понять", "Understand", "Zrozum"),
      text: tp(
        "18 глав: физика VHF, питание, каналы, DSC, процедуры, NAVTEX, EPIRB, SART, SMCP и региональные различия.",
        "18 chapters: VHF physics, power, channels, DSC, procedures, NAVTEX, EPIRB, SART, SMCP, and regional differences.",
        "18 rozdziałów: fizyka VHF, zasilanie, kanały, DSC, procedury, NAVTEX, EPIRB, SART, SMCP i różnice regionalne.",
      ),
      href: "/radio/teoria",
      action: tp("Открыть курс", "Open course", "Otwórz kurs"),
    },
    {
      number: "02",
      title: tp("Научиться управлять", "Operate", "Obsługuj"),
      text: tl({
        pl: "15 kolejnych lekcji na ICOM IC-M330GE i IC-M323 używanych na egzaminie praktycznym.",
        ru: "15 последовательных уроков на моделях ICOM IC-M330GE и IC-M323, используемых на практическом экзамене.",
        en: "15 sequential lessons on the ICOM IC-M330GE and IC-M323 used in the practical exam.",
        es: "15 lecciones seguidas con los ICOM IC-M330GE e IC-M323 que se usan en el examen práctico.",
        fr: "15 leçons progressives sur les ICOM IC-M330GE et IC-M323 utilisés à l'examen pratique.",
        de: "15 aufeinander aufbauende Lektionen an den ICOM IC-M330GE und IC-M323, die in der praktischen Prüfung verwendet werden.",
        it: "15 lezioni in sequenza sugli ICOM IC-M330GE e IC-M323 usati all'esame pratico.",
      }),
      href: RADIO_GUIDED_HREF,
      action: tp("Курс управления", "Controls course", "Kurs obsługi"),
    },
    {
      number: "03",
      title: tp("Выполнить под давлением", "Perform under pressure", "Wykonaj pod presją"),
      text: tp(
        "19 сценариев, голосовая оценка, разговоры, память сканирования, ручной ввод позиции и MMSI, а также разбор ошибок.",
        "19 scenarios, voice grading, conversations, scan memory, manual position and MMSI entry, and mistake debriefs.",
        "19 scenariuszy, ocena głosu, rozmowy, pamięć skanowania, ręczne wprowadzanie pozycji i MMSI oraz omówienie błędów.",
      ),
      href: "/radio/symulator",
      action: tp("Открыть симулятор", "Open simulator", "Otwórz symulator"),
    },
    {
      number: "04",
      title: tl({ pl: "Zdaj w formacie egzaminu", ru: "Сдать в формате экзамена", en: "Pass the exam format", es: "Supera el formato del examen", fr: "Réussir le format de l'examen", de: "Das Prüfungsformat bestehen", it: "Supera il formato d'esame" }),
      text: tp(
        "324 учебных вопроса, пробный экзамен 2 x 5, 26 практических заданий и тематическое повторение.",
        "324 study questions, a 2 x 5 mock exam, 26 practical tasks, and topic-based review.",
        "324 pytania, egzamin próbny 2 x 5, 26 zadań praktycznych i powtórka tematyczna.",
      ),
      href: "/radio/test?mode=exam",
      action: tp("Пробный экзамен", "Mock exam", "Egzamin próbny"),
    },
  ];

  return (
    <div id="radio-course-home">
      <header className="mb-8 grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_320px]" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--text-secondary)" }}>
            {radioText(tl({ pl: "Kurs radiowy SRC", ru: "Курс радиосвязи SRC", en: "SRC radio course", es: "Curso de radio SRC", fr: "Cours de radio SRC", de: "SRC-Funkkurs", it: "Corso di radio SRC" }))}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
            {radioText(tp(
              "От понимания системы до уверенной работы в эфире",
              "From understanding the system to confident radio work",
              "Od zrozumienia systemu do pewnej pracy w eterze",
            ))}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {radioText(tl({
              pl: "Kurs rozdziela odpowiedź egzaminacyjną, procedurę międzynarodową i praktykę lokalną. Najpierw rozumiesz przyczynę, potem odpowiadasz na pytania i wykonujesz procedurę na ICOM.",
              ru: "Курс разделяет три вещи: ответ для экзамена, международную процедуру и местную практику. Сначала ты понимаешь причину, затем отвечаешь на вопросы и только после этого выполняешь процедуру на ICOM.",
              en: "The course separates the exam answer, international procedure, and local practice. First understand the reason, then answer questions, then perform the procedure on an ICOM.",
              es: "El curso separa tres cosas: la respuesta de examen, el procedimiento internacional y la práctica local. Primero entiendes el porqué, luego respondes preguntas y después haces el procedimiento en un ICOM.",
              fr: "Le cours distingue trois choses : la réponse attendue à l'examen, la procédure internationale et la pratique locale. D'abord tu comprends pourquoi, puis tu réponds aux questions, puis tu exécutes la procédure sur un ICOM.",
              de: "Der Kurs trennt drei Dinge: die Prüfungsantwort, das internationale Verfahren und die örtliche Praxis. Zuerst verstehst du den Grund, dann beantwortest du Fragen und erst danach führst du das Verfahren an einem ICOM aus.",
              it: "Il corso distingue tre cose: la risposta d'esame, la procedura internazionale e la pratica locale. Prima capisci il perché, poi rispondi alle domande e infine esegui la procedura su un ICOM.",
            }))}
          </p>
          <Link
            href={next.href}
            className="mt-6 inline-flex min-h-[48px] items-center rounded-xl px-5 text-sm font-bold"
            style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
          >
            {radioText(next.title)} <span className="ml-2" aria-hidden>{radioText("->")}</span>
          </Link>
          <p className="mt-2 max-w-xl text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {radioText(next.description)}
          </p>
        </div>

        <section aria-label={radioText(tp("Общий прогресс", "Overall progress", "Postęp ogólny"))} className="self-start border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {radioText(tp("Прогресс обучения", "Learning progress", "Postęp nauki"))}
            </h2>
            <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {radioText(progress.overallPercent)}%
            </span>
          </div>
          <div className="space-y-4">
            <ProgressLine label={tp("Теория", "Theory", "Teoria")} value={progress.theoryCompleted} total={progress.theoryTotal} />
            <ProgressLine label={tp("Вопросы закреплены", "Questions mastered", "Pytania utrwalone")} value={progress.questionsMastered} total={progress.questionsTotal} />
            <ProgressLine label={tp("Сценарии сданы", "Scenarios passed", "Scenariusze zaliczone")} value={progress.scenariosPassed} total={progress.scenariosTotal} />
            <ProgressLine label={tp("Управление ICOM", "ICOM controls", "Obsługa ICOM")} value={progress.guideCompleted} total={progress.guideTotal} />
          </div>
        </section>
      </header>

      <WeakSpotsPanel areas={RADIO_WEAK_AREAS} />

      <section className="mb-10">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {radioText(tp("Порядок подготовки", "Preparation path", "Ścieżka przygotowania"))}
        </h2>
        <div className="mt-5 divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {path.map((stage) => (
            <article key={stage.number} className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center">
              <span className="font-mono text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                {radioText(stage.number)}
              </span>
              <div>
                <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>{radioText(stage.title)}</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {radioText(stage.text)}
                </p>
              </div>
              <Link
                href={stage.href}
                className="flex min-h-[44px] items-center font-semibold underline decoration-dotted underline-offset-4"
                style={{ color: "var(--accent-cyan)" }}
              >
                {radioText(stage.action)}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10 grid gap-6 border-y py-6 md:grid-cols-3" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {radioText(tl({ pl: "Format egzaminu", ru: "Формат экзамена", en: "Exam format", es: "Formato del examen", fr: "Format de l'examen", de: "Prüfungsformat", it: "Formato d'esame" }))}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {radioText(tp(
              "По 5 вопросов из каждого экзаменационного предмета. Практика выполняется на ICOM IC-M323 или IC-M330GE.",
              "Five questions from each exam subject. The practical part uses an ICOM IC-M323 or IC-M330GE.",
              "Po 5 pytań z każdego przedmiotu. Praktyka odbywa się na ICOM IC-M323 lub IC-M330GE.",
            ))}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {radioText(tp("Статус ответов", "Answer status", "Status odpowiedzi"))}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {radioText(tp(
              "UKE не публикует официальный ключ. Ответы курса являются учебной интерпретацией, спорные позиции помечены, а из каждого вопроса можно перейти к главе и источникам.",
              "UKE does not publish an official answer key. Course answers are a study interpretation, uncertain items are marked, and every question links to its chapter and sources.",
              "UKE nie publikuje oficjalnego klucza. Odpowiedzi kursu są interpretacją szkoleniową, wątpliwe pozycje są oznaczone, a każde pytanie prowadzi do rozdziału i źródeł.",
            ))}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {radioText(tp("Официальный источник", "Official source", "Oficjalne źródło"))}
          </h2>
          <a
            href="https://bip.uke.gov.pl/swiadectwa-operatora-urzadzen-radiowych-tresci/swiadectwa-morskie-i-zeglugi-srodladowej%2C4.html"
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex min-h-[44px] items-center text-sm font-semibold underline underline-offset-4"
            style={{ color: "var(--accent-cyan)" }}
          >
            {radioText(tp("Правила и материалы UKE", "UKE rules and materials", "Zasady i materiały UKE"))}
          </a>
        </div>
      </section>

      <nav aria-label={radioText(tp("Дополнительные тренажёры", "Additional trainers", "Dodatkowe trenażery"))} className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/radio/rozmowa" className="flex min-h-[44px] items-center underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
          {radioText(tp("Живой разговор", "Live conversation", "Rozmowa na żywo"))}
        </Link>
        <Link href="/radio/pozycja" className="flex min-h-[44px] items-center underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
          {radioText(tp("Диктовка позиции", "Position dictation", "Dyktowanie pozycji"))}
        </Link>
        <Link href={PHONETIC_DRILL_HREF} className="flex min-h-[44px] items-center underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
          {tl(PHONETIC_ENTRY_COPY.drillTitle)}
        </Link>
        <Link href="/radio/zadania" className="flex min-h-[44px] items-center underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
          {radioText(tp("26 практических заданий", "26 practical tasks", "26 zadań praktycznych"))}
        </Link>
        <Link href="/radio/sciaga" className="flex min-h-[44px] items-center underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
          {radioText(tp("Шпаргалка после курса", "Post-course cheat sheet", "Ściąga po kursie"))}
        </Link>
      </nav>
    </div>
  );
}
