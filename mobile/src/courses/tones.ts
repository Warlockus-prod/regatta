/**
 * App colours for the points of sail on paper. The shared `pointsOfSail`
 * data keeps its web colours (bright, made for a dark page); on the light
 * app they faded or glared, so the wheel and the course cards use these
 * calmer tones: `rgb` for tinted fills, `ink` for lines and text on them.
 * Same hue family per course as the web: red, amber, green-teal, blue, indigo.
 */
export interface PointOfSailTone {
  rgb: string;
  ink: string;
}

const TONES: Record<string, PointOfSailTone> = {
  'in-irons': { rgb: '179, 38, 30', ink: '#9b2019' },
  'close-hauled': { rgb: '176, 106, 0', ink: '#7a4f00' },
  'beam-reach': { rgb: '0, 109, 112', ink: '#00585b' },
  'broad-reach': { rgb: '0, 110, 166', ink: '#005a88' },
  running: { rgb: '88, 72, 170', ink: '#4a3c93' },
};

const FALLBACK: PointOfSailTone = { rgb: '18, 50, 71', ink: '#123247' };

export function pointOfSailTone(id: string): PointOfSailTone {
  return TONES[id] ?? FALLBACK;
}

/** Wedge fill: a light tint, stronger when the course is selected. */
export function toneFill(id: string, selected: boolean): string {
  return `rgba(${pointOfSailTone(id).rgb}, ${selected ? 0.26 : 0.12})`;
}
