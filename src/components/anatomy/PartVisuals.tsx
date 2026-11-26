import { partVisuals } from "@/data/anatomy-visuals";

const TILE = { margin: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "#f5f3ee" } as const;
const CAPTION = { padding: "4px 8px", textAlign: "center", fontSize: 12, lineHeight: "16px", color: "#3f5568" } as const;

/**
 * Package 32: the two visuals of a yacht part, side by side, the same in every section that
 * shows the part: the schematic (the part marked on a drawing of the whole yacht) and the
 * picture of it on the boat. Renders nothing for an id that is not a part of the yacht.
 * `labels` are the two captions (UI_TERMS.visualDiagram and visualOnBoat in the reader's language).
 */
export function PartVisuals({ id, name, labels, className }: { id: string; name: string; labels: { diagram: string; picture: string }; className?: string }) {
  const visuals = partVisuals(id);
  if (!visuals) return null;
  const { drawing, picture } = visuals;
  const cx = drawing.x * drawing.width, cy = drawing.y * drawing.height;
  // The ring is sized in the drawing's own units so it reads the same on the profile and on the narrow plan.
  const ring = Math.max(drawing.width, drawing.height) * 0.035;
  return (
    // The layout is in inline styles on purpose: the app's bundled pages are built with their own
    // style sheet, and a class invented here would be missing there (the pair fell into one column).
    <div className={className} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 8 }} data-testid="part-visuals" data-part={id}>
      <figure style={TILE}>
        <svg viewBox={`0 0 ${drawing.width} ${drawing.height}`} role="img" aria-label={`${name}: ${labels.diagram}`}
          style={{ display: "block", width: "100%", aspectRatio: "2 / 3" }} preserveAspectRatio="xMidYMid meet" data-testid="part-diagram" data-view={drawing.view}>
          <image href={drawing.src} width={drawing.width} height={drawing.height} />
          <line x1={0} y1={cy} x2={drawing.width} y2={cy} stroke="#0b6f96" strokeWidth={ring * 0.08} strokeDasharray={`${ring * 0.3} ${ring * 0.3}`} opacity={0.55} />
          <line x1={cx} y1={0} x2={cx} y2={drawing.height} stroke="#0b6f96" strokeWidth={ring * 0.08} strokeDasharray={`${ring * 0.3} ${ring * 0.3}`} opacity={0.55} />
          <circle cx={cx} cy={cy} r={ring} fill="rgba(0, 170, 220, 0.18)" stroke="#0b6f96" strokeWidth={ring * 0.16} data-testid="part-diagram-mark" />
          <circle cx={cx} cy={cy} r={ring * 0.18} fill="#0b6f96" />
        </svg>
        <figcaption style={CAPTION}>{labels.diagram}</figcaption>
      </figure>
      <figure style={TILE}>
        {/* eslint-disable-next-line @next/next/no-img-element -- A static, pre-sized picture; the offline bundle has no image optimizer. */}
        <img src={picture.src} width={picture.width} height={picture.height} alt={`${name}: ${labels.picture}`} loading="lazy" decoding="async"
          style={{ display: "block", width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: "cover" }} data-testid="part-picture" />
        <figcaption style={CAPTION}>{labels.picture}</figcaption>
      </figure>
    </div>
  );
}

/**
 * The parts a section teaches, each with its two visuals and its name, in one strip that scrolls
 * sideways (a checklist or an onboard section names up to a dozen parts). `names` gives each
 * part's name in the reader's language.
 */
export function PartStrip({ parts, names, labels, title }: { parts: readonly string[]; names: (id: string) => string; labels: { diagram: string; picture: string }; title: string }) {
  if (!parts.length) return null;
  return (
    <div style={{ marginTop: 12 }} data-testid="part-strip">
      <div style={{ marginBottom: 8, fontSize: 12, lineHeight: "16px", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>{title}</div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x proximity" }}>
        {parts.map(id => (
          <figure key={id} style={{ margin: 0, width: 272, flexShrink: 0, scrollSnapAlign: "start" }}>
            <PartVisuals id={id} name={names(id)} labels={labels} />
            <figcaption style={{ marginTop: 4, fontSize: 14, lineHeight: "20px", fontWeight: 600, color: "var(--text-primary)" }}>{names(id)}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
