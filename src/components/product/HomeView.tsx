import Link from "next/link";
import { UI_TERMS, destinations, type Language } from "@/lib/product/catalog";
import { copy } from "@/lib/product/copy";
import { appStoreUrl, trackAppStoreClick } from "@/lib/funnel";
import { SCENE_STILL_SIZE, SCENE_STILL_WEB, hasMeaningfulStep, homeEntryCopy } from "@/lib/product/home-entry";
import { emptyLearningSnapshot, homeCopy, homeLearning, webStepEvidence, type LearningSnapshot } from "@/lib/product/learning";
import styles from "./Home.module.css";

/**
 * The website home (package 9, audit K1 and K2). One value line, a real frame
 * of the race scene and exactly ONE primary action: "Start from scratch" for a
 * new visitor, "Continue learning" only after a meaningful step (a passed
 * check, src/lib/product/home-entry.ts). "Go straight to a race" is a quieter
 * row; the radio and motorboat courses are separate quiet entrances below.
 * `snapshot` is null until the browser storage is read, then the action area
 * shows a status instead of guessing.
 */
export function HomeView({ lang, snapshot, error, onRetry, raceHref }: { lang: Language; snapshot: LearningSnapshot | null; error: boolean; onRetry: () => void; raceHref: string }) {
  const e = homeEntryCopy;
  const next = snapshot ? homeLearning(snapshot, lang, "web") : null;
  const returning = snapshot ? hasMeaningfulStep(webStepEvidence(snapshot)) : false;
  const fresh = homeLearning(emptyLearningSnapshot(), lang, "web");
  const other = returning && next ? destinations.find(d => d.id === (next.course.id === "sails" ? "course" : "sails")) : undefined;
  const exams = destinations.filter(d => d.certificate && d.web);
  return <div className={styles.page}>
    <div className={styles.intro}>
      <header className={styles.header}>
        <p className={styles.wordmark}>{UI_TERMS.brand[lang]}</p>
        <h1>{e.value[lang]}</h1>
        <p className={styles.lead}>{e.valueDetail[lang]}</p>
      </header>
      <figure className={styles.scene}>
        {/* eslint-disable-next-line @next/next/no-img-element -- one local still, no image optimizer JS on the home */}
        <img src={SCENE_STILL_WEB} width={SCENE_STILL_SIZE.width} height={SCENE_STILL_SIZE.height} alt={e.sceneAlt[lang]} decoding="async" fetchPriority="high" />
        <figcaption>{e.sceneCaption[lang]}</figcaption>
      </figure>
      <section className={styles.next} aria-label={copy.next[lang]} aria-busy={!snapshot && !error}>
        {!next ? <div role={error ? "alert" : "status"} className={styles.placeholder}>
          <p>{error ? homeCopy.unavailable[lang] : homeCopy.loading[lang]}</p>
          {error && <button type="button" className={styles.overview} onClick={onRetry}>{homeCopy.retry[lang]}</button>}
        </div> : returning ? <div className={styles.resume}>
          <p className={styles.eyebrow}>{next.course.title[lang]}{next.minutes ? ` · ${next.minutes} ${copy.minutes[lang]}` : ""}</p>
          <h2>{next.title}</h2>
          {next.total !== null && <div className={styles.progressBlock}>
            <div className={styles.progressLabel}><span>{next.metric}</span><span>{next.count}/{next.total}</span></div>
            <progress value={next.count!} max={next.total} aria-label={next.metric!} />
          </div>}
          <Link className={styles.primary} data-action="primary" href={next.href}>
            {next.complete ? homeCopy.review[lang] : copy.resume[lang]}<span aria-hidden="true">→</span>
          </Link>
          {next.href !== next.overview && <Link className={styles.overview} href={next.overview}>{copy.overview[lang]}</Link>}
        </div> : <Link className={styles.primary} data-action="primary" href={fresh.href}>
          {e.startFromScratch[lang]}<span aria-hidden="true">→</span>
        </Link>}
        {next && <Link className={styles.secondary} href={raceHref}>{e.straightToRace[lang]}<span aria-hidden="true">→</span></Link>}
      </section>
    </div>
    <div className={styles.more}>
      {other?.web && <section className={styles.quiet} aria-labelledby="home-other">
        <h2 id="home-other">{homeCopy.choose[lang]}</h2>
        <QuietLink href={other.web} title={other.title[lang]} detail={other.detail?.[lang]} />
      </section>}
      <section className={styles.quiet} aria-labelledby="home-exams">
        <h2 id="home-exams">{e.examQuestion[lang]}</h2>
        {exams.map(d => <QuietLink key={d.id} href={d.web!} title={d.title[lang]} detail={d.detail?.[lang]} />)}
      </section>
    </div>
    <footer className={styles.footer}><span>{homeCopy.tools[lang]}</span><Link href="/menu">{copy.allSections[lang]} <span aria-hidden="true">→</span></Link><Link href={appStoreUrl("web_home")} onClick={() => trackAppStoreClick("web_home")}>{copy.app[lang]} <span aria-hidden="true">↗</span></Link></footer>
  </div>;
}

function QuietLink({ href, title, detail }: { href: string; title: string; detail?: string }) {
  return <Link className={styles.course} href={href}>
    <span><strong>{title}</strong>{detail && <span className={styles.courseDetail}>{detail}</span>}</span><span aria-hidden="true">→</span>
  </Link>;
}
