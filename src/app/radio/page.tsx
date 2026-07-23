"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import WeakSpotsPanel from "./WeakSpotsPanel";
import { loadRadioCourseProgress, type RadioCourseProgress } from "./courseProgress";

const EMPTY_PROGRESS: RadioCourseProgress = {
  theoryCompleted: 0,
  theoryTotal: 18,
  questionsMastered: 0,
  questionsSeen: 0,
  questionsTotal: 324,
  scenariosPassed: 0,
  scenariosTotal: 19,
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
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {value}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-secondary)" }}>
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${percent}%`, background: "var(--accent-cyan)" }}
        />
      </div>
    </div>
  );
}

export default function RadioCourseHome() {
  const { tp } = useI18n();
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
        title: tp("Продолжить теорию", "Continue theory", "Kontynuuj teorie"),
        description: tp(
          "Следующая незакрытая глава, схема и проверка из трех вопросов.",
          "The next incomplete chapter, its diagram, and a three-question check.",
          "Nastepny nieukonczony rozdzial, schemat i sprawdzenie z trzech pytan.",
        ),
      };
    }
    if (progress.guideCompleted < progress.guideTotal) {
      return {
        href: "/radio/obsluga",
        title: tp("Закрепить органы управления", "Master the controls", "Utrwal obsluge"),
        description: tp(
          "Пройди управление ICOM до DISTRESS без поиска кнопок.",
          "Complete the ICOM controls through DISTRESS without hunting for buttons.",
          "Przejdz obsluge ICOM do DISTRESS bez szukania klawiszy.",
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
          "Przecwicz procedure i glos, potem przejrzyj konkretne bledy.",
        ),
      };
    }
    return {
      href: "/radio/test?mode=exam",
      title: tp("Сдать пробный экзамен", "Take a mock exam", "Zdaj egzamin probny"),
      description: tp(
        "10 вопросов, по 5 из каждого предмета, затем повтор слабых мест.",
        "10 questions, 5 from each subject, followed by weak-spot review.",
        "10 pytan, po 5 z kazdego przedmiotu, potem powtorka slabych punktow.",
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
        "18 rozdzialow: fizyka VHF, zasilanie, kanaly, DSC, procedury, NAVTEX, EPIRB, SART, SMCP i roznice regionalne.",
      ),
      href: "/radio/teoria",
      action: tp("Открыть курс", "Open course", "Otworz kurs"),
    },
    {
      number: "02",
      title: tp("Научиться управлять", "Operate", "Obsluguj"),
      text: tp(
        "15 последовательных уроков на моделях ICOM IC-M330GE и IC-M323, используемых на практике UKE.",
        "15 sequential lessons on the ICOM IC-M330GE and IC-M323 used in UKE practical exams.",
        "15 kolejnych lekcji na ICOM IC-M330GE i IC-M323 uzywanych na praktyce UKE.",
      ),
      href: "/radio/obsluga",
      action: tp("Курс управления", "Controls course", "Kurs obslugi"),
    },
    {
      number: "03",
      title: tp("Выполнить под давлением", "Perform under pressure", "Wykonaj pod presja"),
      text: tp(
        "19 сценариев, голосовая оценка, разговоры, память сканирования, ручной ввод позиции и MMSI, а также разбор ошибок.",
        "19 scenarios, voice grading, conversations, scan memory, manual position and MMSI entry, and mistake debriefs.",
        "19 scenariuszy, ocena glosu, rozmowy, pamiec skanowania, reczne wprowadzanie pozycji i MMSI oraz omowienie bledow.",
      ),
      href: "/radio/symulator",
      action: tp("Открыть симулятор", "Open simulator", "Otworz symulator"),
    },
    {
      number: "04",
      title: tp("Сдать формат UKE", "Pass the UKE format", "Zdaj format UKE"),
      text: tp(
        "324 учебных вопроса, пробный экзамен 2 x 5, 26 практических заданий и тематическое повторение.",
        "324 study questions, a 2 x 5 mock exam, 26 practical tasks, and topic-based review.",
        "324 pytania, egzamin probny 2 x 5, 26 zadan praktycznych i powtorka tematyczna.",
      ),
      href: "/radio/test?mode=exam",
      action: tp("Пробный экзамен", "Mock exam", "Egzamin probny"),
    },
  ];

  return (
    <div id="radio-course-home">
      <header className="mb-8 grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_320px]" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--accent-cyan)" }}>
            {tp("Подготовка к польскому SRC", "Polish SRC preparation", "Przygotowanie do polskiego SRC")}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
            {tp(
              "От понимания системы до уверенной работы в эфире",
              "From understanding the system to confident radio work",
              "Od zrozumienia systemu do pewnej pracy w eterze",
            )}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {tp(
              "Курс разделяет три вещи: ответ для экзамена UKE, международную процедуру и местную практику. Сначала ты понимаешь причину, затем отвечаешь на вопросы и только после этого выполняешь процедуру на ICOM.",
              "The course separates the UKE exam answer, international procedure, and local practice. First understand the reason, then answer questions, then perform the procedure on an ICOM.",
              "Kurs rozdziela odpowiedz egzaminacyjna UKE, procedure miedzynarodowa i praktyke lokalna. Najpierw rozumiesz przyczyne, potem odpowiadasz na pytania i wykonujesz procedure na ICOM.",
            )}
          </p>
          <Link
            href={next.href}
            className="mt-6 inline-flex min-h-[48px] items-center rounded-xl px-5 text-sm font-bold"
            style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
          >
            {next.title} <span className="ml-2" aria-hidden>{"->"}</span>
          </Link>
          <p className="mt-2 max-w-xl text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {next.description}
          </p>
        </div>

        <section aria-label={tp("Общий прогресс", "Overall progress", "Postep ogolny")} className="self-start border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {tp("Готовность курса", "Course readiness", "Gotowosc kursu")}
            </h2>
            <span className="text-2xl font-bold" style={{ color: "var(--accent-cyan)" }}>
              {progress.overallPercent}%
            </span>
          </div>
          <div className="space-y-4">
            <ProgressLine label={tp("Теория", "Theory", "Teoria")} value={progress.theoryCompleted} total={progress.theoryTotal} />
            <ProgressLine label={tp("Вопросы закреплены", "Questions mastered", "Pytania utrwalone")} value={progress.questionsMastered} total={progress.questionsTotal} />
            <ProgressLine label={tp("Сценарии сданы", "Scenarios passed", "Scenariusze zaliczone")} value={progress.scenariosPassed} total={progress.scenariosTotal} />
            <ProgressLine label={tp("Управление ICOM", "ICOM controls", "Obsluga ICOM")} value={progress.guideCompleted} total={progress.guideTotal} />
          </div>
        </section>
      </header>

      <WeakSpotsPanel />

      <section className="mb-10">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {tp("Порядок подготовки", "Preparation path", "Sciezka przygotowania")}
        </h2>
        <div className="mt-5 divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {path.map((stage) => (
            <article key={stage.number} className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center">
              <span className="font-mono text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>
                {stage.number}
              </span>
              <div>
                <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>{stage.title}</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {stage.text}
                </p>
              </div>
              <Link
                href={stage.href}
                className="flex min-h-[44px] items-center font-semibold underline decoration-dotted underline-offset-4"
                style={{ color: "var(--accent-cyan)" }}
              >
                {stage.action}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10 grid gap-6 border-y py-6 md:grid-cols-3" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {tp("Формат UKE", "UKE format", "Format UKE")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {tp(
              "По 5 вопросов из каждого экзаменационного предмета. Практика выполняется на ICOM IC-M323 или IC-M330GE.",
              "Five questions from each exam subject. The practical part uses an ICOM IC-M323 or IC-M330GE.",
              "Po 5 pytan z kazdego przedmiotu. Praktyka odbywa sie na ICOM IC-M323 lub IC-M330GE.",
            )}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {tp("Статус ответов", "Answer status", "Status odpowiedzi")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {tp(
              "UKE не публикует официальный ключ. Ответы курса являются учебной интерпретацией, спорные позиции помечены, а из каждого вопроса можно перейти к главе и источникам.",
              "UKE does not publish an official answer key. Course answers are a study interpretation, uncertain items are marked, and every question links to its chapter and sources.",
              "UKE nie publikuje oficjalnego klucza. Odpowiedzi kursu sa interpretacja szkoleniowa, watpliwe pozycje sa oznaczone, a kazde pytanie prowadzi do rozdzialu i zrodel.",
            )}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {tp("Официальный источник", "Official source", "Oficjalne zrodlo")}
          </h2>
          <a
            href="https://bip.uke.gov.pl/swiadectwa-operatora-urzadzen-radiowych-tresci/swiadectwa-morskie-i-zeglugi-srodladowej%2C4.html"
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex min-h-[44px] items-center text-sm font-semibold underline underline-offset-4"
            style={{ color: "var(--accent-cyan)" }}
          >
            {tp("Правила и материалы UKE", "UKE rules and materials", "Zasady i materialy UKE")}
          </a>
        </div>
      </section>

      <nav aria-label={tp("Дополнительные тренажёры", "Additional trainers", "Dodatkowe trenazery")} className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/radio/rozmowa" className="flex min-h-[44px] items-center underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
          {tp("Живой разговор", "Live conversation", "Rozmowa na zywo")}
        </Link>
        <Link href="/radio/pozycja" className="flex min-h-[44px] items-center underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
          {tp("Диктовка позиции", "Position dictation", "Dyktowanie pozycji")}
        </Link>
        <Link href="/radio/zadania" className="flex min-h-[44px] items-center underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
          {tp("26 практических заданий", "26 practical tasks", "26 zadan praktycznych")}
        </Link>
        <Link href="/radio/sciaga" className="flex min-h-[44px] items-center underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
          {tp("Шпаргалка после курса", "Post-course cheat sheet", "Sciaga po kursie")}
        </Link>
      </nav>
    </div>
  );
}
