// The feedback layer over the race scene (M1-3): the toasts near the boat from
// the feedback bus (feedback.ts) and the red frame on contact. It only
// informs: no control, no tap target (pointer-events off), no cyan.
// Stateless, so the cockpit renders it without new hooks. The big start
// countdown is drawn by the cockpit with this module's .countdown class.

import type { ContactFrame, FeedbackToast } from "./feedback";
import styles from "./RaceFeedbackLayer.module.css";

export function RaceFeedbackLayer({ toasts, contact }: { toasts: readonly FeedbackToast[]; contact: ContactFrame | null }) {
  return <div className={styles.layer} data-testid="race-feedback">
    {contact && <div key={contact.id} className={styles.contact} data-motion={contact.motion} data-testid="race-contact-frame" aria-hidden="true" />}
    {/* A polite live region that stays mounted, so each new toast is read out. */}
    <div className={styles.toasts} role="status" aria-live="polite" data-testid="race-toasts">
      {toasts.map(t => <p key={t.id} className={styles.toast} data-tone={t.tone} data-source={t.source} data-testid="race-toast">{t.text}</p>)}
    </div>
  </div>;
}
