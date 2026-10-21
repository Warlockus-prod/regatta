/**
 * One queue for the learning-progress keys (bootcamp viewed / done / last
 * viewed, quiz results, course bookmark).
 *
 * Every read and every read-modify-write runs after the ones queued before
 * it. Two things follow: an update never interleaves with another update of
 * the same key (no lost write), and a screen that re-reads on focus sees
 * every write the previous screen queued, even if that write had not landed
 * yet when the user tapped Back.
 *
 * Tasks must not call `serial` themselves (they would wait for their own
 * turn): use the raw helpers inside a task.
 */
let tail: Promise<unknown> = Promise.resolve();

export function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => undefined);
  return run;
}
