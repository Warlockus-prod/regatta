import { PartVisuals } from "@/components/anatomy/PartVisuals";
import { partVisuals } from "@/data/anatomy-visuals";
import { sailLessonPicture, sailingVisuals, type SailingVisuals } from "@/data/sailing-visuals";
import { SubjectSchematic } from "./SubjectSchematic";

/**
 * Package 32: the two visuals of a subject, whatever kind it is: a part of the yacht
 * (src/data/anatomy-visuals.ts) or a sailing subject: a point of sail, a turn, wind, trim
 * (src/data/sailing-visuals.ts).
 * A page passes the id of the item it shows and gets the same schematic and picture every other
 * section shows for that subject, or nothing when the item is not one of these subjects.
 * `labels` are the two captions (UI_TERMS.visualDiagram and visualOnBoat in the reader's language).
 * The layout is in inline styles: the app's bundled pages are built with their own style sheet.
 * The schematic is drawn by SubjectSchematic, which loads the drawings once for every page.
 */
export function SubjectVisuals({ id, name, labels, className }: { id: string; name: string; labels: { diagram: string; picture: string }; className?: string }) {
  if (partVisuals(id)) return <PartVisuals id={id} name={name} labels={labels} className={className} />;
  const visuals = sailingVisuals(id);
  if (!visuals) return null;
  return (
    <div className={className} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }} data-testid="subject-visuals" data-subject={visuals.id}>
      <figure style={TILE}>
        <SubjectSchematic id={visuals.id} label={`${name}: ${labels.diagram}`} testId="subject-diagram" />
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
// margin 0: a caption inside a lesson's figure would take that figure's caption margins.
const CAPTION = { margin: 0, padding: "4px 8px", textAlign: "center", fontSize: 12, lineHeight: "16px", color: "#3f5568" } as const;

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

/**
 * The same pair as two small tiles without captions, for a card that already names its subject
 * (an exercise of the trainer: drillVisuals in src/data/sailing-visuals.ts). The card's own text
 * is the label, so the tiles are hidden from assistive technology.
 */
export function SubjectThumbs({ visuals, width = 232 }: { visuals: SailingVisuals | null; width?: number }) {
  if (!visuals) return null;
  return (
    <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 6, width: "100%", maxWidth: width, marginTop: 8 }} data-testid="subject-thumbs" data-subject={visuals.id}>
      <SubjectSchematic id={visuals.id} style={THUMB} />
      {/* eslint-disable-next-line @next/next/no-img-element -- A static, pre-sized picture; the offline bundle has no image optimizer. */}
      <img src={visuals.picture.src} width={visuals.picture.width} height={visuals.picture.height} alt="" loading="lazy" decoding="async"
        style={{ ...THUMB, display: "block", width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: "cover" }} />
    </div>
  );
}
const THUMB = { overflow: "hidden", borderRadius: 6, border: "1px solid var(--border-subtle)", background: "#f5f3ee" } as const;

/** The picture of a sail lesson (sailLessonPicture), beside the lesson's own drawing. `labels` are the two possible captions, `name` the lesson's title. */
export function LessonPicture({ lessonId, name, labels, className }: { lessonId: string; name: string; labels: { boat: string; water: string }; className?: string }) {
  const picture = sailLessonPicture(lessonId);
  if (!picture) return null;
  const label = "part" in picture.asset ? labels.boat : labels.water;
  return (
    <figure className={className} style={{ ...TILE, maxWidth: 360, marginTop: 16 }} data-testid="lesson-picture">
      {/* eslint-disable-next-line @next/next/no-img-element -- A static, pre-sized picture; the offline bundle has no image optimizer. */}
      <img src={picture.src} width={picture.width} height={picture.height} alt={`${name}: ${label}`} loading="lazy" decoding="async"
        style={{ display: "block", width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: "cover" }} />
      <figcaption style={CAPTION}>{label}</figcaption>
    </figure>
  );
}

/**
 * The picture alone, for a page that draws its own labelled diagram of the subject (a rule card,
 * the tactics page): ruleVisuals and tacticsVisuals in src/data/sailing-visuals.ts. `label` is the
 * caption (UI_TERMS.visualOnWater in the reader's language).
 */
export function SubjectPicture({ visuals, name, label, className, maxWidth = 360 }: { visuals: SailingVisuals | null; name: string; label: string; className?: string; maxWidth?: number }) {
  if (!visuals) return null;
  return (
    <figure className={className} style={{ ...TILE, maxWidth }} data-testid="subject-picture-tile" data-subject={visuals.id}>
      {/* eslint-disable-next-line @next/next/no-img-element -- A static, pre-sized picture; the offline bundle has no image optimizer. */}
      <img src={visuals.picture.src} width={visuals.picture.width} height={visuals.picture.height} alt={`${name}: ${label}`} loading="lazy" decoding="async"
        style={{ display: "block", width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: "cover" }} />
      <figcaption style={CAPTION}>{label}</figcaption>
    </figure>
  );
}

/**
 * A list row's thumbnail: the subject's schematic alone, small (a rule card's header, where every
 * card names one of the eight drawings). The row's own text is the label, so the tile is hidden
 * from assistive technology.
 */
export function SchematicThumb({ visuals, width = 64 }: { visuals: SailingVisuals | null; width?: number }) {
  if (!visuals) return null;
  return <div aria-hidden="true" style={{ ...THUMB, width, flexShrink: 0 }} data-testid="schematic-thumb" data-subject={visuals.id}><SubjectSchematic id={visuals.id} /></div>;
}
