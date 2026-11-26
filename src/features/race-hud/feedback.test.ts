import { describe, expect, it } from "vitest";
import {
  CONTACT_FRAME, FEEDBACK_DURATION, FEEDBACK_LIMITS, createFeedbackState, nextFeedbackChange, postContact, postFeedback,
  raceEventSource, tickFeedback, type FeedbackPost, type FeedbackState,
} from "./feedback";

// Contract (M1-3): a rule notice never hides a race event. Up to
// FEEDBACK_LIMITS.visible messages share the screen in priority order; a
// higher priority takes the lowest slot, the rest wait briefly in the queue;
// each message leaves after its own duration; the contact frame does not flash
// for a viewer who asked for reduced motion.
const rule: FeedbackPost = { source: "rule", text: "Port tack gives way to starboard.", tone: "danger" };
const missed: FeedbackPost = { source: "missed-mark", text: "Finish not counted.", tone: "danger" };
const tack: FeedbackPost = { source: "manoeuvre", text: "Tack: -1.2 kn", tone: "info" };
const mark: FeedbackPost = { source: "mark", text: "Mark: 2nd, +4.3 s", tone: "info" };
const place: FeedbackPost = { source: "place", text: "Overtake! You're 2nd", tone: "success" };
const texts = (s: FeedbackState) => s.visible.map(t => t.text);
const run = (posts: [number, FeedbackPost][]) => posts.reduce((s, [at, p]) => postFeedback(s, p, at), createFeedbackState());

describe("race feedback bus", () => {
  it("shows a race event next to a 7-second rule notice instead of behind it", () => {
    const s = run([[0, rule], [1, tack]]);
    expect(texts(s)).toEqual([rule.text, tack.text]);
    // The event leaves after its own 2.6 s while the rule notice stays.
    expect(texts(tickFeedback(s, 1 + FEEDBACK_DURATION.manoeuvre + .01))).toEqual([rule.text]);
    expect(texts(tickFeedback(s, FEEDBACK_DURATION.rule + .01))).toEqual([]);
  });

  it("orders by priority, then by the time a message appeared", () => {
    const s = run([[0, tack], [.5, rule]]);
    expect(texts(s)).toEqual([rule.text, tack.text]);
    const same = run([[0, mark], [.5, place]]);
    expect(texts(same)).toEqual([mark.text, place.text]);
  });

  it("replaces the older message of the same source", () => {
    const s = run([[0, tack], [1, { ...tack, text: "Tack: -0.4 kn" }]]);
    expect(texts(s)).toEqual(["Tack: -0.4 kn"]);
    expect(s.visible[0].until).toBeCloseTo(1 + FEEDBACK_DURATION.manoeuvre, 6);
  });

  it("lets a higher priority take the lowest slot and shows the displaced one when a slot frees up", () => {
    const full = run([[0, rule], [.2, tack]]);
    expect(full.visible).toHaveLength(FEEDBACK_LIMITS.visible);
    const s = postFeedback(full, missed, .5);
    expect(texts(s)).toEqual([rule.text, missed.text]);
    expect(s.queue.map(t => t.text)).toEqual([tack.text]);
    // Nothing frees a slot within the wait: the displaced event is dropped, not shown late.
    expect(tickFeedback(s, .5 + FEEDBACK_LIMITS.maxWaitSec + .01).queue).toEqual([]);
    // A slot that frees within the wait shows it: the rule notice ends at 7 s.
    const late = postFeedback(run([[0, rule], [5.5, tack]]), missed, 6);
    expect(late.queue.map(t => t.text)).toEqual([tack.text]);
    const promoted = tickFeedback(late, 7.01);
    expect(texts(promoted)).toEqual([missed.text, tack.text]);
    expect(promoted.visible[1].until).toBeCloseTo(7.01 + FEEDBACK_DURATION.manoeuvre, 6);
    const lowerFirst = postFeedback(run([[0, rule], [.1, missed]]), mark, .2);
    expect(texts(lowerFirst)).toEqual([rule.text, missed.text]);
    expect(lowerFirst.queue.map(t => t.text)).toEqual([mark.text]);
    // Only a higher priority displaces: a race event on a full stack of a rule
    // notice and another race event waits for the slot instead of taking it.
    const equal = postFeedback(run([[0, rule], [.2, tack]]), place, 1);
    expect(texts(equal)).toEqual([rule.text, tack.text]);
    expect(equal.queue.map(t => t.text)).toEqual([place.text]);
    expect(texts(tickFeedback(equal, .2 + FEEDBACK_DURATION.manoeuvre + .01))).toEqual([rule.text, place.text]);
  });

  it("promotes the queue by priority, then first posted", () => {
    let s = run([[0, rule], [0, missed], [.1, mark], [.2, { source: "contact", text: "Contact", tone: "danger" }], [.3, place]]);
    expect(s.queue.map(t => t.source)).toEqual(["mark", "contact", "place"]);
    // The rule notice and the missed-mark notice run out together at 7 s; the queue is stale by then.
    expect(tickFeedback(s, 7.01).visible).toEqual([]);
    // With fresh entries the higher priority and then the older one come first.
    s = run([[10, rule], [10, missed], [10.1, place], [10.2, { source: "contact", text: "Contact", tone: "danger" }], [10.3, mark]]);
    const freed = { ...s, visible: [] };
    expect(tickFeedback(freed, 10.4).visible.map(t => t.source)).toEqual(["contact", "place"]);
  });

  it("schedules the next change and nothing when idle", () => {
    expect(nextFeedbackChange(createFeedbackState())).toBeNull();
    const s = run([[0, rule], [1, tack]]);
    expect(nextFeedbackChange(s)).toBeCloseTo(1 + FEEDBACK_DURATION.manoeuvre, 6);
    const queued = postFeedback(run([[0, rule], [0, missed]]), place, 3);
    expect(nextFeedbackChange(queued)).toBeCloseTo(3 + FEEDBACK_LIMITS.maxWaitSec, 6);
    expect(tickFeedback(createFeedbackState(), 5)).toEqual(createFeedbackState());
  });

  it("flashes the contact frame, and holds it still for reduced motion", () => {
    const flash = postContact(createFeedbackState(), 2, false).contact!;
    expect(flash).toMatchObject({ motion: "flash" });
    expect(flash.until).toBeCloseTo(2 + CONTACT_FRAME.flashSec, 6);
    const still = postContact(createFeedbackState(), 2, true).contact!;
    expect(still).toMatchObject({ motion: "static" });
    expect(still.until).toBeCloseTo(2 + CONTACT_FRAME.staticSec, 6);
    expect(tickFeedback(postContact(createFeedbackState(), 2, true), 2 + CONTACT_FRAME.staticSec + .01).contact).toBeNull();
    // A new contact gets a new id, so the frame restarts.
    const again = postContact(postContact(createFeedbackState(), 2, false), 2.5, false);
    expect(again.contact!.id).not.toBe(flash.id);
    // The frame never touches the message stack.
    expect(postContact(run([[0, tack]]), .1, false).visible.map(t => t.text)).toEqual([tack.text]);
  });

  it("gives each race event its own source", () => {
    expect(["tack", "gybe", "mark", "gained", "lost"].map(k => raceEventSource(k as "tack"))).toEqual(["manoeuvre", "manoeuvre", "mark", "place", "place"]);
  });
});

// Contract (M4-7): a first race hint is shown alone, so the longest message
// never pushes another one down towards the boat: the race events on screen
// step back to the queue, nothing joins the hint, a rule notice on screen
// makes it wait and a new rule notice takes its place. Nothing is lost to the
// hint: a message held back by what is on screen (race events behind a hint,
// a hint behind a rule notice) waits until that leaves and then has its
// FEEDBACK_LIMITS.maxWaitSec, so it is shown right after.
describe("first race hint on the feedback bus", () => {
  const hint: FeedbackPost = { source: "hint", text: "No-go zone: bear away.", tone: "info", tag: "no-go" };
  const hintEnd = (postedAt: number) => postedAt + FEEDBACK_DURATION.hint;
  it("is shown alone and keeps its tag", () => {
    const s = run([[0, tack], [.2, place], [.5, hint]]);
    expect(texts(s)).toEqual([hint.text]);
    expect(s.visible[0].tag).toBe("no-go");
    // A race event posted while the hint is up waits instead of joining it.
    expect(texts(postFeedback(s, mark, 1))).toEqual([hint.text]);
  });

  it("shows the race events it held back once it has gone, the tack cost of the first tack too", () => {
    // The first tack hint goes up on the tack; its cost is told up to 4 s later.
    const s = run([[0, hint], [3.5, tack]]);
    expect(texts(s)).toEqual([hint.text]);
    // Still held long after the usual wait, never dropped while the hint is up.
    expect(texts(tickFeedback(s, hintEnd(0) - .01))).toEqual([hint.text]);
    expect(tickFeedback(s, hintEnd(0) - .01).queue.map(t => t.source)).toEqual(["manoeuvre"]);
    // The hint's end is the next change, then the cost is on screen for its own time.
    expect(nextFeedbackChange(s)).toBe(hintEnd(0));
    const after = tickFeedback(s, hintEnd(0));
    expect(texts(after)).toEqual([tack.text]);
    expect(after.visible[0].until).toBe(hintEnd(0) + FEEDBACK_DURATION.manoeuvre);
    // Race events the hint pushed off the screen come back too: a mark split and a place change.
    const pushed = run([[0, mark], [.2, place], [.5, hint]]);
    expect(texts(tickFeedback(pushed, hintEnd(.5) + FEEDBACK_LIMITS.maxWaitSec - .01))).toEqual([mark.text, place.text]);
    // Once back, a message held back does not wait forever: the usual limit counts from the hint's end.
    const late = { ...pushed, visible: [] };
    expect(texts(tickFeedback(late, hintEnd(.5) + FEEDBACK_LIMITS.maxWaitSec + .01))).toEqual([]);
  });

  it("waits behind a rule notice for as long as it is up, then goes up alone", () => {
    const behind = run([[0, rule], [.5, hint]]);
    expect(texts(behind)).toEqual([rule.text]);
    expect(behind.queue.map(t => t.source)).toEqual(["hint"]);
    // Well past the usual wait, the hint is still queued while the rule notice is up.
    const waiting = tickFeedback(behind, FEEDBACK_DURATION.rule - .01);
    expect(waiting.queue.map(t => t.source)).toEqual(["hint"]);
    // A race event posted meanwhile joins the rule notice, and steps back when the hint goes up.
    const busy = postFeedback(waiting, tack, FEEDBACK_DURATION.rule - 1);
    expect(texts(busy)).toEqual([rule.text, tack.text]);
    const up = tickFeedback(busy, FEEDBACK_DURATION.rule);
    expect(texts(up)).toEqual([hint.text]);
    expect(up.visible[0].tag).toBe("no-go");
    expect(up.queue.map(t => t.source)).toEqual(["manoeuvre"]);
    expect(texts(tickFeedback(up, hintEnd(FEEDBACK_DURATION.rule)))).toEqual([tack.text]);
    // A new rule notice takes the hint's place on screen; the hint comes back after it.
    const replaced = run([[0, hint], [1, rule]]);
    expect(texts(replaced)).toEqual([rule.text]);
    expect(texts(tickFeedback(replaced, 1 + FEEDBACK_DURATION.rule))).toEqual([hint.text]);
    // A queued hint is never shown next to another message.
    const queued = run([[0, tack], [.1, rule], [.2, hint]]);
    expect(texts(queued)).toEqual([rule.text, tack.text]);
    expect(texts(tickFeedback(queued, 2.7))).toEqual([rule.text]);
    expect(texts(tickFeedback({ ...queued, visible: queued.visible.filter(t => t.source !== "rule") }, 1))).toEqual([hint.text]);
  });
});
