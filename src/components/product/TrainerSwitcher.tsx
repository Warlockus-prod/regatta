import { TRAINER_NAMES, TRAINER_SWITCHER_LABEL, type TrainerId } from "../../lib/product/trainer-names";
import type { Lang } from "../../lib/languages";

const TRAINERS: { id: TrainerId; href: string }[] = [
  { id: "basics", href: "/simulator" },
  { id: "trainer", href: "/simulator-v3" },
  { id: "boat", href: "/simulator2" },
];

/** The one switcher of the three trainer pages (R-13, audit B2): the same look,
 * size and order on each. Plain links: the Trainer page is also bundled without
 * the Next router. Native embeds hide it and use the app's own bar with the same names. */
export function TrainerSwitcher({ current, lang, className = "" }: { current: TrainerId; lang: Lang; className?: string }) {
  return (
    <nav aria-label={TRAINER_SWITCHER_LABEL[lang]} data-testid="trainer-switcher" className={`grid grid-cols-3 gap-1 ${className}`}>
      {TRAINERS.map(({ id, href }) => {
        const active = id === current;
        return (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- See above: no Next router in the offline bundle.
          <a key={id} href={href} aria-current={active ? "page" : undefined}
            className="flex min-h-11 min-w-0 items-center justify-center rounded-md border px-2 py-1 text-center text-sm font-semibold leading-4 transition"
            style={active
              ? { background: "rgba(0, 212, 255, 0.14)", borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)" }
              : { borderColor: "rgba(139, 167, 184, 0.3)", color: "var(--text-secondary)" }}>
            {TRAINER_NAMES[id][lang]}
          </a>
        );
      })}
    </nav>
  );
}
