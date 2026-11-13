import { PartVisuals } from "@/components/anatomy/PartVisuals";
import { partVisuals } from "@/data/anatomy-visuals";
import { sailingVisuals } from "@/data/sailing-visuals";

/**
 * Package 32: the two visuals of a subject, whatever kind it is: a part of the yacht
 * (src/data/anatomy-visuals.ts) or a point of sail or turn (src/data/sailing-visuals.ts).
 * A page passes the id of the item it shows and gets the same schematic and picture every other
 * section shows for that subject, or nothing when the item is not one of these subjects.
 * `labels` are the two captions (UI_TERMS.visualDiagram and visualOnBoat in the reader's language).
 * The layout is in inline styles: the app's bundled pages are built with their own style sheet.
 */
export function SubjectVisuals({ id, name, labels, className }: { id: string; name: string; labels: { diagram: string; picture: string }; className?: string }) {
  if (partVisuals(id)) return <PartVisuals id={id} name={name} labels={labels} className={className} />;
  const visuals = sailingVisuals(id);
  if (!visuals) return null;
  // The drawing is decorative markup inside a labelled figure: its own English label is dropped.
  const svg = visuals.schematic().replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true" style="display:block;width:100%;height:auto"');
  return (
    <div className={className} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }} data-testid="subject-visuals" data-subject={visuals.id}>
      <figure style={TILE}>
        <div role="img" aria-label={`${name}: ${labels.diagram}`} data-testid="subject-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
        <figcaption style={CAPTION}>{labels.diagram}</figcaption>
      </figure>
      <figure style={TILE}>
        {/* eslint-disable-next-line @next/next/no-img-element -- A static, pre-sized picture; the offline bundle has no image optimizer. */}
        <img src={visuals.picture.src} width={visuals.picture.width} height={visuals.picture.height} alt={`${name}: ${labels.picture}`} loading="lazy" decoding="async"
          style={{ display: "block", width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: "cover" }} data-testid="subject-picture" />
        <figcaption style={CAPTION}>{labels.picture}</figcaption>
      </figure>
    </div>
  );
}

const TILE = { margin: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "#f5f3ee" } as const;
const CAPTION = { padding: "4px 8px", textAlign: "center", fontSize: 12, lineHeight: "16px", color: "#3f5568" } as const;

/** The subjects a section teaches, each with its two visuals and its name, in one strip that scrolls sideways. */
export function SubjectStrip({ ids, names, labels, title }: { ids: readonly string[]; names: (id: string) => string; labels: { diagram: string; picture: string }; title: string }) {
  if (!ids.length) return null;
  return (
    <div style={{ marginTop: 12 }} data-testid="subject-strip">
      <div style={{ marginBottom: 8, fontSize: 12, lineHeight: "16px", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>{title}</div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x proximity" }}>
        {ids.map(id => (
          <figure key={id} style={{ margin: 0, width: 288, flexShrink: 0, scrollSnapAlign: "start" }}>
            <SubjectVisuals id={id} name={names(id)} labels={labels} />
            <figcaption style={{ marginTop: 4, fontSize: 14, lineHeight: "20px", fontWeight: 600, color: "var(--text-primary)" }}>{names(id)}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
