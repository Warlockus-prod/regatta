/**
 * Stylized side-profile of a cruising yacht, drawn in a 1000x500 viewbox.
 *
 * The viewbox matches the `side.x / side.y` coordinates already stored in
 * `mobile/src/data/anatomy.json`, so the hotspot positions in `hotspots.ts`
 * line up with the drawing without any extra scaling math at render time.
 *
 * Each path is a thin elegant outline (1.5pt) that the screen layer renders
 * in `colors.textSecondary` over a faint cyan glow. The shape is deliberately
 * abstract: simple curves for hull and sails so it reads at a glance, not a
 * photorealistic rig diagram. Tweak by editing the path strings below; keep
 * the viewbox at 1000x500 or update both `YACHT_VIEWBOX` and `hotspots.ts`.
 */

export const YACHT_VIEWBOX = { width: 1000, height: 500 } as const;

export interface YachtPath {
  /** Stable id (debug, ordering). */
  id: string;
  /** SVG path string in the 1000x500 viewbox. */
  d: string;
  /**
   * Render hint. 'sail' paths get a slightly thicker stroke and a sail-toned
   * fill; 'rig' paths are thin lines (mast / boom / stays); 'hull' paths are
   * the boat outline; 'foil' is rudder + keel below the waterline.
   */
  kind: 'hull' | 'sail' | 'rig' | 'foil' | 'water';
}

export const YACHT_PATHS: YachtPath[] = [
  {
    id: 'water',
    kind: 'water',
    d: 'M 40 330 L 960 330',
  },
  {
    id: 'hull-deck',
    kind: 'hull',
    d:
      'M 150 290 ' +
      'C 220 250, 360 240, 540 240 ' +
      'C 700 240, 800 248, 850 268 ' +
      'L 850 290 Z',
  },
  {
    id: 'hull-bottom',
    kind: 'hull',
    d:
      'M 150 290 ' +
      'C 220 365, 360 380, 540 380 ' +
      'C 700 380, 800 360, 850 320 ' +
      'L 850 290',
  },
  {
    id: 'cockpit',
    kind: 'hull',
    d: 'M 640 240 L 670 218 L 740 218 L 760 240',
  },
  {
    id: 'cabin-trunk',
    kind: 'hull',
    d:
      'M 360 240 ' +
      'L 380 222 ' +
      'L 600 222 ' +
      'L 620 240',
  },
  {
    id: 'keel',
    kind: 'foil',
    d:
      'M 460 380 ' +
      'L 450 430 ' +
      'L 525 440 ' +
      'L 510 380 Z',
  },
  {
    id: 'rudder',
    kind: 'foil',
    d:
      'M 815 360 ' +
      'L 808 430 ' +
      'L 826 432 ' +
      'L 825 365 Z',
  },
  {
    id: 'mast',
    kind: 'rig',
    d: 'M 420 222 L 420 60',
  },
  {
    id: 'boom',
    kind: 'rig',
    d: 'M 420 232 L 600 250',
  },
  {
    id: 'forestay',
    kind: 'rig',
    d: 'M 420 60 L 200 248',
  },
  {
    id: 'backstay',
    kind: 'rig',
    d: 'M 420 60 L 800 250',
  },
  {
    id: 'shroud-port',
    kind: 'rig',
    d: 'M 420 60 L 380 240',
  },
  {
    id: 'shroud-stbd',
    kind: 'rig',
    d: 'M 420 60 L 460 240',
  },
  {
    id: 'mainsail',
    kind: 'sail',
    d:
      'M 425 65 ' +
      'L 425 230 ' +
      'L 595 248 ' +
      'C 540 200, 480 145, 425 65 Z',
  },
  {
    id: 'jib',
    kind: 'sail',
    d:
      'M 415 75 ' +
      'L 207 246 ' +
      'L 415 232 Z',
  },
  {
    id: 'pulpit-bow',
    kind: 'rig',
    d: 'M 200 246 L 175 232 L 175 250',
  },
  {
    id: 'pulpit-stern',
    kind: 'rig',
    d: 'M 800 248 L 832 235 L 832 252',
  },
  {
    id: 'wheel',
    kind: 'rig',
    d:
      'M 716 232 ' +
      'a 8 8 0 1 0 0.01 0',
  },
  {
    id: 'winch-port',
    kind: 'rig',
    d:
      'M 555 232 ' +
      'a 5 5 0 1 0 0.01 0',
  },
  {
    id: 'winch-stbd',
    kind: 'rig',
    d:
      'M 605 232 ' +
      'a 5 5 0 1 0 0.01 0',
  },
];
