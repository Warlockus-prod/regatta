'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getBootcampProgress, setCurrentLesson, type BootcampProgress } from "@/lib/storage";
import { bootcampLessons } from "@/data/bootcamp";
import { destinations, sections } from "@/lib/product/catalog";
import { copy } from "@/lib/product/copy";
import styles from "@/components/product/Product.module.css";

export default function Home() {
  const { lang, tp } = useI18n();
  const [progress, setProgress] = useState<BootcampProgress | null>(null);
  useEffect(() => {
    const refresh = () => setProgress(getBootcampProgress());
    const timer = setTimeout(refresh, 0);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const completed = bootcampLessons.filter(l => progress?.completed.includes(l.id)).length;
  const next = bootcampLessons.find(l => l.id === progress?.current && !progress?.completed.includes(l.id)) ?? bootcampLessons.find(l => !progress?.completed.includes(l.id));
  const started = Boolean(progress?.current || completed);
  const allDone = completed === bootcampLessons.length;
  const title = next ? tp(next.titleRu, next.titleEn, next.titlePl, { es: next.titleEs, fr: next.titleFr, de: next.titleDe, it: next.titleIt }) : "";
  const course = destinations.find(d => d.id === "course")!;
  return <div className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>{copy.hello[lang]}</h1>
      <p className={styles.intro}>{copy.intro[lang]}</p>
    </header>
    <section className={styles.feature} aria-labelledby="next-step">
      <div>
        <p className={styles.kicker}>{started ? `${copy.next[lang]} · ${completed}/${bootcampLessons.length}` : copy.next[lang]}</p>
        <h2 id="next-step" className={styles.heading}>{allDone ? copy.learned[lang] : started ? title : course.title[lang]}</h2>
        <p className={styles.description}>{started && next ? `${next.estMinutes} ${copy.minutes[lang]}` : course.detail![lang]}</p>
        {started && <progress className={styles.progress} value={completed} max={bootcampLessons.length} aria-label={copy.viewed[lang]} />}
      </div>
      <div className={styles.actions}>
        <Link className={styles.primary} href={allDone ? "/race" : next?.route ?? "/start"} onClick={() => { if (next) setCurrentLesson(next.id); }}>
          {allDone ? sections.find(s => s.id === "race")!.title[lang] : started ? copy.resume[lang] : copy.start[lang]} <span aria-hidden="true">→</span>
        </Link>
        <Link className={styles.secondary} href="/start">{copy.overview[lang]}</Link>
      </div>
    </section>
    <div className={styles.choices}>{sections.filter(s => s.id === "practice" || s.id === "race").map(s => <Link href={s.web} key={s.id} className={styles.choice}>
      <div><h2>{s.title[lang]}</h2><p className={styles.description}>{s.description[lang]}</p></div><span className={styles.arrow} aria-hidden="true">→</span>
    </Link>)}</div>
    <div className={styles.quietLinks}>
      <Link href="/learn">{copy.exam[lang]} <span aria-hidden="true">→</span></Link>
      <Link href="https://apps.apple.com/app/id6768134329">{copy.app[lang]} <span aria-hidden="true">↗</span></Link>
    </div>
  </div>;
}
