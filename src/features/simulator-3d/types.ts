// Shared types for the standalone V2 (3D) simulator module.
import { SAIL_PLAN } from "@/lib/sailing-physics/sail-plan";

/** Visual rig state the 3D yacht renders from (drives morphs + rig nodes). */
export interface YachtState {
  /** Resolved angles already include maneuver dynamics; do not smooth twice. */
  rigResolved?: boolean;
  /** Remember the lee side even with a hard-sheeted central boom. */
  sailSide?: 1 | -1;
  wind?: { from: number; knots: number };
  apparentWind?: { from: number; knots: number };
  fill?: number;
  airSpeed?: number;
  /** Main boom angle off centerline, signed deg (positive = starboard, negative = port). */
  boomAngle: number;
  /** Jib clew angle off centerline, signed deg. */
  jibAngle: number;
  /** Sail draft / belly, 0 (flat) .. 1 (full). */
  camber: number;
  /** Leech twist, 0 (closed) .. 1 (open). */
  twist: number;
  /** Luffing / flogging, 0 .. 1. */
  luff: number;
  /** Reef, 0 .. 1. */
  reef: number;
  /** Rudder angle, deg (-35 .. 35). */
  rudderAngle: number;
  /** Visual heel, signed deg (positive = starboard, negative = port). */
  heel: number;
  /** Boat speed, knots (drives wake/foam intensity; 0 in free-trim mode). */
  speedKn?: number;
  /** Compass heading; omitted for a posed yacht. */
  heading?: number;
  /** World travel in metres, X east and Z south. */
  travel?: { x: number; z: number };
  /** Independent jib shape. Reef always belongs to the mainsail. */
  jibShape?: { camber: number; twist: number; luff: number; furl: number; fill?: number; airSpeed?: number };
}

export const NEUTRAL_YACHT: YachtState = {
  boomAngle: 0,
  jibAngle: 0,
  camber: 0.2,
  twist: 0.25,
  luff: 0,
  reef: 0,
  rudderAngle: 0,
  heel: 0,
  speedKn: 0,
};

/** UI strings, injectable so the core has no i18n dependency. */
export interface SceneLabels {
  whole: string; sails: string; both: string; deck: string; main: string; jib: string; stern: string; flow: string; resetView: string;
  more: string; instruments: string; loading: string; error: string;
  retry: string; heading: string; target: string; apparent: string;
  light: string; quality: string; sailingHint: string;
  fullSailPlan: string;
  relativeWind: string; trueWind: string; calmWind: string;
}

export interface SimLabels {
  scene: SceneLabels;
  badge: string;
  orbitHint: string;
  /** Shown in free-trim mode: where steering lives. */
  freeModeHint: string;
  modeFree: string;
  modeSail: string;
  pointOfSail: string;
  mainsheet: string;
  jibsheet: string;
  camber: string;
  twist: string;
  luffing: string;
  reef: string;
  rudder: string;
  heel: string;
  helm: string;
  wind: string;
  windSpeed: string;
  speed: string;
  sound: string;
  bestVmg: string;
  reset: string;
  presets: { luff: string; close: string; beam: string; broad: string; run: string };
  sailStatus: { inIrons: string; calm: string; luffing: string; stalled: string; drawing: string; transferring: string };
  maneuver: { tacking: string; gybing: string };
  sheetScale: string;
  coach: {
    inIrons: string;
    luffEaseIn: string;
    stallEaseOut: string;
    pinching: string;
    good: string;
    reachOn: string;
    run: string;
  };
  /** Hold-to-steer buttons (touch + mouse) and keyboard steering. */
  steerLeft: string;
  steerRight: string;
  /** Onboarding tour: auto-opens on first visit, reopenable via the ? button. */
  tour: {
    open: string;
    next: string;
    back: string;
    done: string;
    steps: { title: string; body: string }[];
  };
}

export const DEFAULT_LABELS: SimLabels = {
  scene: {
    fullSailPlan: `Full sails: main ${SAIL_PLAN.main.area} m², jib ${SAIL_PLAN.jib.area} m²`,
    main: "Main", jib: "Jib", stern: "Astern", flow: "Airflow",
    relativeWind: "relative to bow", trueWind: "True wind", calmWind: "No airflow",
    whole: "Whole yacht", sails: "Sails", both: "Both", deck: "Deck", resetView: "Reset camera",
    more: "Wind and fine tuning", instruments: "More instruments", loading: "Loading yacht...",
    error: "The 3D scene could not load. Check your connection or try another browser.",
    retry: "Try again", heading: "Heading", target: "Target speed", apparent: "Apparent wind",
    light: "Light graphics", quality: "Graphics", sailingHint: "Hold an arrow to steer. Sails change sides automatically; you control the sheets.",
  },
  badge: 'SIMULATOR V2 - 3D',
  orbitHint: 'drag to orbit, wheel to zoom',
  freeModeHint: 'Free trim poses the rig. To steer and turn the boat, switch to Sailing.',
  modeFree: 'Free trim',
  modeSail: 'Sailing',
  pointOfSail: 'Point of sail',
  mainsheet: 'Mainsheet (boom)',
  jibsheet: 'Jib sheet',
  camber: 'Draft (camber)',
  twist: 'Twist',
  luffing: 'Luffing',
  reef: 'Reef',
  rudder: 'Rudder',
  heel: 'Heel',
  helm: 'Helm',
  wind: 'Wind from',
  windSpeed: 'Wind speed',
  speed: 'Speed',
  sound: 'Sound',
  bestVmg: 'Best VMG',
  reset: 'Reset',
  presets: { luff: 'In irons', close: 'Close-hauled', beam: 'Beam reach', broad: 'Broad reach', run: 'Run' },
  sailStatus: { inIrons: "In irons: bear away", calm: "Little airflow", luffing: "Luffing: sheet in slightly", stalled: "Stalled: ease the sheet", drawing: "Drawing", transferring: "Changing sides" },
  maneuver: { tacking: "Tacking: sails unload and fill on the new side", gybing: "Gybing: the crew transfers the sails automatically" },
  sheetScale: "0% sheeted in · 100% eased out",
  coach: {
    inIrons: 'In irons - bear away to fill the sails',
    luffEaseIn: 'Luffing - sheet in or bear away',
    stallEaseOut: 'Stalled - ease the sheet',
    pinching: 'Pinching - bear away a touch',
    good: 'Well trimmed - both sails pulling',
    reachOn: 'Trim for the reach',
    run: "Running: ease the sheets for the following wind",
  },
  steerLeft: 'Steer left',
  steerRight: 'Steer right',
  tour: {
    open: 'Guide',
    next: 'Next',
    back: 'Back',
    done: 'Got it',
    steps: [
      { title: '3D Boat', body: 'Drag the scene to orbit the boat, pinch or scroll to zoom. Sails, telltales and the sea are live.' },
      { title: 'Steering', body: 'Hold the round buttons at the scene edges (or the left/right arrow keys) to turn. Release and the helm returns to 0. The slider is for fine trim of the rudder.' },
      { title: 'Sheets', body: 'Ease the main and jib sheets until the sail just starts to luff, then sheet back in a touch. The coach hint at the bottom tells you what the sails feel.' },
      { title: 'Instruments', body: 'SPEED is yours, TGT is the target at perfect trim, VMG is progress toward the wind. "Best VMG" is the angle worth sailing.' },
      { title: 'Free trim', body: 'The second mode poses the rig: camber, twist, reef. Reopen this guide anytime with the ? button.' },
    ],
  },
};
