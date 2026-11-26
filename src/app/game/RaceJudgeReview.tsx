'use client';

import { fillJudgeTemplate, raceJudgeCopy as copy } from "@/data/race-judge-copy";
import { useI18n } from "@/lib/i18n";
import type { RaceJudgeDebrief, RaceJudgeItem } from "@/lib/race-judge";
import { practiceForJudgeItem } from "@/lib/race-practice";
import type { RaceReturn } from "@/lib/race-return";
import { RacePracticeLink } from "./RacePracticeLink";
import { WatchMomentButton } from "./WatchMomentButton";

/** Race time as m:ss from the start signal (negative before the signal). */
function clock(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  const total = Math.round(Math.abs(seconds));
  return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Presentational training judge debrief for the finish screen. Pure view of
 * buildRaceJudgeDebrief(); it decides nothing itself. Its only actions are the
 * M4-2 practice links under each item (cyan as actions; none without a return)
 * and the M4-3 "Watch the moment" (the replay 5 s before it; none without a replay). */
export function RaceJudgeReview({ debrief, boatName, titleHidden = false, practiceReturn = null, native = false, onWatch }: {
  debrief: RaceJudgeDebrief;
  boatName?: (boatId: string) => string;
  /** The result screen already shows the same title on its collapsed row, so
   * the heading stays for screen readers only (no visible duplicate). */
  titleHidden?: boolean;
  /** M4-2: the race the practice links return to; without it, no links. */
  practiceReturn?: RaceReturn | null;
  native?: boolean;
  /** M4-3: open the replay at an item's moment; without it, no button. */
  onWatch?: (at: number) => void;
}) {
  const { tl } = useI18n();
  const { items, summary } = debrief;
  const name = (id: string) => boatName?.(id) ?? id;

  const penaltyLine = (item: RaceJudgeItem) => {
    const p = item.penalty;
    const text = tl(copy.penalty[p.kind]);
    return "seconds" in p ? fillJudgeTemplate(text, { s: p.seconds }) : text;
  };

  return (
    <section aria-labelledby="race-judge-title" data-testid="race-judge-review"
      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-base leading-6 text-[var(--text-primary)]">
      <h2 id="race-judge-title" className={titleHidden ? "sr-only" : "text-lg font-semibold leading-7"}>{tl(copy.title)}</h2>
      <p className={titleHidden ? "text-[var(--text-secondary)]" : "mt-1 text-[var(--text-secondary)]"}>{tl(copy.intro)}</p>

      <dl className="mt-3 grid grid-cols-3 gap-2" data-testid="race-judge-summary">
        <div className="rounded-md bg-[var(--bg-secondary)] p-2">
          <dt className="text-[var(--text-muted)]">{tl(copy.incidents)}</dt>
          <dd className="font-semibold tabular-nums">{summary.incidents}</dd>
        </div>
        <div className="rounded-md bg-[var(--bg-secondary)] p-2">
          <dt className="text-[var(--text-muted)]">{tl(copy.totalPenalty)}</dt>
          <dd className="font-semibold tabular-nums" style={summary.totalPenaltySeconds ? { color: "var(--danger)" } : undefined}>
            {summary.totalPenaltySeconds ? "+" : ""}{fillJudgeTemplate(tl(copy.seconds), { s: summary.totalPenaltySeconds })}
          </dd>
        </div>
        <div className="rounded-md bg-[var(--bg-secondary)] p-2">
          <dt className="text-[var(--text-muted)]">{tl(copy.uncertain)}</dt>
          <dd className="font-semibold tabular-nums">{summary.uncertain}</dd>
        </div>
      </dl>

      {items.length === 0 ? (
        <p className="mt-3" style={{ color: "var(--success)" }}>{tl(copy.clean)}</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {items.map(item => (
            <li key={item.id} data-testid="race-judge-item" data-kind={item.kind} data-penalty={item.penalty.kind}
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
              <p className="text-[var(--text-muted)]">
                <span className="tabular-nums">{clock(item.time)}</span>{" · "}
                {tl(copy.phase[item.phase])}
                {item.phaseNote ? ` (${tl(copy.phaseNote[item.phaseNote])})` : ""}
              </p>
              {item.jostle ? (
                <>
                  <h3 className="font-semibold">{tl(copy.jostle)}</h3>
                  <p>{tl(copy.lesson[item.lesson])}</p>
                  {item.occurrences > 1 && <p className="text-[var(--text-muted)]">{fillJudgeTemplate(tl(copy.occurrences), { n: item.occurrences })}</p>}
                  {onWatch && <div><WatchMomentButton at={item.time} onWatch={onWatch} /></div>}
                </>
              ) : <>
              <h3 className="font-semibold">
                {tl(copy.kind[item.kind])}
                <span className="font-normal text-[var(--text-secondary)]">{" · "}{fillJudgeTemplate(tl(copy.rule), { rule: item.rule })}</span>
              </h3>
              {item.otherBoatId && <p className="text-[var(--text-secondary)]">{fillJudgeTemplate(tl(copy.withBoat), { boat: name(item.otherBoatId) })}</p>}
              {item.rightOfWay !== "not-applicable" && <p>{tl(copy.rightOfWay[item.rightOfWay])}</p>}
              <p style={item.penalty.kind === "applied" ? { color: "var(--danger)" } : item.penalty.kind === "correction-required" ? { color: "var(--warning)" } : undefined}>
                {penaltyLine(item)}
              </p>
              {item.resolved !== undefined && <p>{tl(item.resolved ? copy.returned : copy.notReturned)}</p>}
              {item.occurrences > 1 && <p className="text-[var(--text-muted)]">{fillJudgeTemplate(tl(copy.occurrences), { n: item.occurrences })}</p>}
              <p className="mt-2">
                <strong>{tl(copy.nextTime)}</strong> {tl(copy.lesson[item.lesson])}
              </p>
              {practiceReturn && <RacePracticeLink target={practiceForJudgeItem(item)} ret={practiceReturn} native={native} />}
              {onWatch && <div><WatchMomentButton at={item.time} onWatch={onWatch} /></div>}
              </>}
            </li>
          ))}
        </ol>
      )}

      <h3 className="mt-4 font-semibold">{tl(copy.notCoveredTitle)}</h3>
      <ul className="mt-1 list-disc pl-5 text-[var(--text-secondary)]" data-testid="race-judge-not-covered">
        {summary.notCovered.map(key => <li key={key}>{tl(copy.notCovered[key])}</li>)}
      </ul>
    </section>
  );
}
