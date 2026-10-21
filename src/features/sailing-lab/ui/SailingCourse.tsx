'use client';

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../../lib/i18n";
import { destinations } from "../../../lib/product/catalog";
import { copy } from "../../../lib/product/copy";
import { trackLessonComplete } from "../../../lib/funnel";
import { findSailLesson, sailCourse, sailLessons } from "../../../data/sailing-lab/course";
import { checkSailTheory, nextSailLesson, readSailProgress, SAIL_PROGRESS_KEY, type SailProgress } from "../lessons/progress";
import { diagramCopy, diagramOptions, diagramReadout, sailDiagram } from "../lessons/diagrams";
import styles from "./SailingCourse.module.css";
import { courseModules, learningCopy, lessonSteps, lessonTermIds, lessonTerms, type LessonStep } from "../../../data/sailing-lab/learning-path";
import { assessmentCopy } from "../../../data/sailing-lab/assessment-copy";
import { LineBench } from "./LineBench";
import { guideCopy, lessonGoals, moduleGoals } from "../../../data/sailing-lab/lesson-guide";
import { LESSON_POSITION_KEY, readPositions, visitLesson, type LessonPosition } from "../lessons/lesson-position";
import { PRACTICE_RESULTS_KEY, readPracticeResults, lessonPracticeIds, type PracticeResults } from "../lessons/practice-results";
import { LEARNING_BOOKMARK_KEY, readLearningBookmark } from "../../../lib/product/learning";

export function SailingCourse({ lessonId }: { lessonId?: string }) {
  return <CourseContent key={lessonId ?? "outline"} lessonId={lessonId} />;
}

function CourseContent({ lessonId }: { lessonId?: string }) {
  const { lang } = useI18n();
  const [step, setStep] = useState<LessonStep>("understand");
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const moveTo = (nextStep: LessonStep) => {
    setStep(nextStep);
    remember({ step: nextStep });
    requestAnimationFrame(() => stepHeading.current?.focus());
  };
  const [progress, setProgress] = useState<SailProgress | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [readError, setReadError] = useState(false);
  const [position, setPosition] = useState<string | null>(null);
  const [results, setResults] = useState<PracticeResults>(() => readPracticeResults(null));
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);
  const interacted = useRef(false);
  const [selected, setSelected] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const lesson = lessonId ? findSailLesson(lessonId) : undefined;
  const remember = (patch: Partial<LessonPosition>) => {
    interacted.current = true;
    if (!lesson || readError) return;
    try {
      const next = visitLesson(readPositions(localStorage.getItem(LESSON_POSITION_KEY)), lesson.id, patch);
      localStorage.setItem(LESSON_POSITION_KEY, JSON.stringify(next));
      setStorageError(false);
    } catch { setStorageError(true); }
  };
  useEffect(() => {
    const load = () => {
      try {
        setProgress(readSailProgress(localStorage.getItem(SAIL_PROGRESS_KEY)));
        setResults(readPracticeResults(localStorage.getItem(PRACTICE_RESULTS_KEY)));
        const positions = readPositions(localStorage.getItem(LESSON_POSITION_KEY));
        const bookmark = readLearningBookmark(localStorage.getItem(LEARNING_BOOKMARK_KEY));
        setPosition((bookmark?.course === "sails" ? bookmark.lesson : null) ?? positions.current);
        if (lesson && !interacted.current) {
          setStep(positions.lessons[lesson.id]?.step ?? "understand");
          setSelected(positions.lessons[lesson.id]?.diagram ?? 0);
        }
        if (lesson) {
          try { localStorage.setItem(LESSON_POSITION_KEY, JSON.stringify(visitLesson(positions, lesson.id))); }
          catch { setStorageError(true); }
        }
        setReadError(false);
      } catch { setReadError(true); }
    };
    const timer = setTimeout(load, 0);
    window.addEventListener("pageshow", load);
    window.addEventListener("focus", load);
    return () => { clearTimeout(timer); window.removeEventListener("pageshow", load); window.removeEventListener("focus", load); };
  }, [lesson]);
  const resumed = position && progress && !progress.checked.includes(position) ? findSailLesson(position) : undefined;
  const next = progress ? resumed ?? nextSailLesson(progress) : sailLessons[0];
  const openModule = expanded === undefined ? courseModules.find(m => m.lessons.includes(next?.id ?? sailLessons[0].id))?.id : expanded;
  const persistCheck = () => {
    if (!lesson || !progress || readError || answer === null) return;
    try {
      const stored = readSailProgress(localStorage.getItem(SAIL_PROGRESS_KEY));
      const updated = checkSailTheory(stored, lesson.id, answer);
      if (updated.checked.length > stored.checked.length) trackLessonComplete("sails", lesson.id);
      localStorage.setItem(SAIL_PROGRESS_KEY, JSON.stringify(updated)); setProgress(updated); setStorageError(false);
    }
    catch { setStorageError(true); }
  };
  if (lessonId && !lesson) return <article className={styles.page}><h1>{copy.empty[lang]}</h1><Link href="/learn/sails">{sailCourse.back[lang]}</Link></article>;
  if (!lesson) return <article className={styles.page}>
    <nav className={styles.breadcrumb}><Link href="/learn">{copy.sailing[lang]}</Link></nav>
    <h1>{sailCourse.title[lang]}</h1><p className={styles.lead}>{sailCourse.intro[lang]}</p>
    <section className={styles.next}>
      <p className={styles.eyebrow}>{position ? guideCopy.resume[lang] : copy.next[lang]}</p>
      <Link className={styles.primary} href={`/learn/sails/${(next ?? sailLessons[0]).id}`}>{next?.title[lang] ?? learningCopy.review[lang]} <span aria-hidden="true">→</span></Link>
      <p>{progress?.checked.length ?? 0}/{sailLessons.length} · {sailCourse.completed[lang]}</p>
    </section>
    <h2>{learningCopy.outline[lang]}</h2>
    <div className={styles.modules}>{courseModules.map((module, moduleIndex) => {
      const done = module.lessons.filter(id => progress?.checked.includes(id)).length;
      const duration = module.lessons.reduce((sum, id) => sum + findSailLesson(id)!.minutes, 0);
      const open = openModule === module.id;
      return <section className={styles.module} key={module.id}>
        <button className={styles.moduleToggle} aria-expanded={open} aria-controls={`module-${module.id}`} onClick={() => setExpanded(open ? null : module.id)}>
          <span className={styles.moduleArt} aria-hidden="true" dangerouslySetInnerHTML={{ __html: sailDiagram(findSailLesson(module.lessons[0])!.diagram, 0) }} />
          <span className={styles.moduleText}><span className={styles.eyebrow}>{guideCopy.module[lang]} {moduleIndex + 1} · {duration} {copy.minutes[lang]}</span><strong>{module.title[lang]}</strong><span>{moduleGoals[module.id][lang]}</span><small>{done}/{module.lessons.length} · {sailCourse.completed[lang]}</small></span>
          <span className={styles.moduleChevron} aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        {open && <ol id={`module-${module.id}`} className={styles.lessons}>{module.lessons.map(id => {
          const item = findSailLesson(id)!;
          return <li key={id}><Link href={`/learn/sails/${id}`} data-next-lesson={next?.id === id ? "true" : undefined}>
            <span className={styles.number}>{progress?.checked.includes(id) ? "✓" : String(sailLessons.indexOf(item) + 1).padStart(2, "0")}</span><span><strong>{item.title[lang]}</strong><small>{item.minutes} {copy.minutes[lang]}{progress?.checked.includes(id) ? ` · ${sailCourse.completed[lang]}` : ""}</small></span><span aria-hidden="true">→</span>
          </Link></li>;
        })}</ol>}
      </section>;
    })}</div>
    <p className={styles.note}>{sailCourse.scope[lang]}</p>
    {storageError && <p role="alert">{sailCourse.savedError[lang]}</p>}
    {readError && <p role="alert">{guideCopy.readError[lang]}</p>}
  </article>;
  const index = sailLessons.findIndex(item => item.id === lesson.id);
  const destination = destinations.find(item => item.id === lesson.destination)!;
  const checked = progress?.checked.includes(lesson.id);
  return <article className={`${styles.page} ${styles.lessonPage}`}>
    <nav className={styles.breadcrumb}><Link href="/learn/sails">← {sailCourse.back[lang]}</Link><span>{index + 1}/{sailLessons.length} · {lesson.minutes} {copy.minutes[lang]}</span></nav>
    <p className={styles.eyebrow}>{courseModules.find(m => m.lessons.includes(lesson.id))?.title[lang]}</p>
    <h1>{lesson.title[lang]}</h1>
    <div className={styles.goal}><p className={styles.eyebrow}>{guideCopy.goal[lang]}</p><p>{lessonGoals[lesson.id][lang]}</p></div>
    {readError && <p role="alert">{guideCopy.readError[lang]}</p>}
    {storageError && step !== "check" && <p role="alert">{sailCourse.savedError[lang]}</p>}
    <nav className={styles.steps} aria-label={learningCopy.steps[lang]}>{lessonSteps.map((item, i) => <button key={item} type="button" aria-current={step === item ? "step" : undefined} onClick={() => moveTo(item)}><span>{i + 1}</span>{learningCopy[item][lang]}</button>)}</nav>
    <h2 className={styles.stepHeading} tabIndex={-1} ref={stepHeading}>{learningCopy[step][lang]}</h2>
    {step === "understand" && <div className={styles.studyLayout}>
    <figure className={styles.figure}>
      <h3 className={styles.figureTitle}>{guideCopy.explore[lang]}</h3>
      <div className={styles.diagramCanvas} role="img" aria-label={diagramCopy[lesson.diagram][lang]} dangerouslySetInnerHTML={{ __html: sailDiagram(lesson.diagram, selected) }} />
      <figcaption>{diagramCopy[lesson.diagram][lang]}</figcaption>
      {diagramReadout(lesson.diagram, selected, lang) && <p aria-live="polite">{diagramReadout(lesson.diagram, selected, lang)}</p>}
      <div className={styles.controls}>{diagramOptions(lesson.diagram, lang).map(option => <button key={option.value} type="button" aria-pressed={selected === option.value} onClick={() => { setSelected(option.value); remember({ diagram: option.value }); }}>{option.label}</button>)}</div>
      {lesson.diagram === "wind" && <p>{diagramCopy.windKeys.map((label, i) => `${i + 1}. ${label[lang]}`).join(" · ")}</p>}
    </figure>
    <div className={styles.reading}>
    <details className={styles.terms}>
      <summary>{learningCopy.terms[lang]} <span>{(lessonTermIds[lesson.id] ?? []).length}</span></summary>
      <dl>{(lessonTermIds[lesson.id] ?? []).map(id => <div key={id}><dt>{lessonTerms[id].name[lang]}</dt><dd>{lessonTerms[id].meaning[lang]}</dd></div>)}</dl>
    </details>
    {lesson.sections.map((section, i) => <section className={styles.prose} key={i}><h2>{section.title[lang]}</h2><p>{section.body[lang]}</p></section>)}
    <details className={styles.sources}><summary>{sailCourse.sources[lang]}</summary>{lesson.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</details>
    <button className={styles.primary} type="button" onClick={() => moveTo("check")}>{learningCopy.toCheck[lang]} →</button>
    </div>
    </div>}
    {step === "check" && <>
    <section className={styles.check} aria-labelledby="theory-check">
      <h2 id="theory-check">{sailCourse.check[lang]}</h2><p>{lesson.question[lang]}</p>
      <div className={styles.answers}>{lesson.answers.map((option, i) => <button key={i} type="button" aria-pressed={answer === i} onClick={() => setAnswer(i)}>{option[lang]}</button>)}</div>
      {answer !== null && <div role="status"><strong>{answer === lesson.correct ? sailCourse.correct[lang] : sailCourse.retry[lang]}</strong><p>{lesson.explanation[lang]}</p></div>}
      {checked ? <p role="status">✓ {sailCourse.completed[lang]}</p> : <button type="button" className={styles.primary} disabled={!progress || readError || answer !== lesson.correct} onClick={persistCheck}>{sailCourse.finish[lang]}</button>}
      {storageError && <p role="alert">{sailCourse.savedError[lang]}</p>}
      <p className={styles.note}>{learningCopy.theoryOnly[lang]}</p>
    </section>
    <div className={styles.actions}><button className={styles.secondary} type="button" onClick={() => moveTo("understand")}>{learningCopy.toTheory[lang]}</button><button className={styles.secondary} type="button" onClick={() => moveTo("try")}>{learningCopy.toTry[lang]} →</button></div>
    </>}
    {step === "try" && <>
    {lessonPracticeIds(lesson.id).some(id => results.completed[id]) && <section className={styles.resultSummary}><h2>{guideCopy.practice[lang]}</h2>{lessonPracticeIds(lesson.id).filter(id => results.completed[id]).map(id => <p key={id}>✓ {id === "twist" || id === "depth" ? assessmentCopy[id][lang] : lesson.title[lang]}</p>)}<p className={styles.note}>{guideCopy.saved[lang]}</p></section>}
    {lesson.practice === "line-bench" ? <LineBench lang={lang} /> : <>
    <p className={styles.note}>{learningCopy.observeOnly[lang]}</p>
    <section className={styles.prose}><h2>{sailCourse.observe[lang]}</h2><p>{lesson.observe[lang]}</p><Link className={styles.primary} href={`${destination.web!}?lesson=${lesson.id}${lesson.study ? `&study=${lesson.study}` : ""}`}>{destination.title[lang]} →</Link></section>
    <p className={styles.note}>{guideCopy.returnNote[lang]}</p>
    </>}
    {lesson.id === "outhaul" && <section className={styles.prose}>
      <h2>{assessmentCopy.title[lang]}</h2><p>{assessmentCopy.intro[lang]}</p>
      <div className={styles.actions}>{(["twist", "depth"] as const).map(task => <Link className={styles.secondary} key={task} href={`/simulator-v3?lesson=${lesson.id}&assessment=${task}`}>{assessmentCopy[task][lang]} →</Link>)}</div>

    </section>}
    <p className={styles.note}>{sailCourse.safety[lang]}</p>
    </>}
    <footer className={styles.breadcrumb}><Link href="/learn/sails">{sailCourse.back[lang]}</Link>{step === "try" && sailLessons[index + 1] && <Link className={styles.secondary} href={`/learn/sails/${sailLessons[index + 1].id}`}>{sailCourse.next[lang]} →</Link>}</footer>
  </article>;
}
