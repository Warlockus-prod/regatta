// Shared types for the standalone V2 (3D) simulator module.

/** Visual rig state the 3D yacht renders from (drives morphs + rig nodes). */
export interface YachtState {
  /** Main boom angle off centerline, signed deg (sign picks the lee side). */
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
  /** Visual heel, signed deg (sign leans toward the lee side). */
  heel: number;
  /** Boat speed, knots (drives wake/foam intensity; 0 in free-trim mode). */
  speedKn?: number;
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
export interface SimLabels {
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
  coach: {
    inIrons: 'In irons - bear away to fill the sails',
    luffEaseIn: 'Luffing - sheet in or bear away',
    stallEaseOut: 'Stalled - ease the sheet',
    pinching: 'Pinching - bear away a touch',
    good: 'Well trimmed - both sails pulling',
    reachOn: 'Trim for the reach',
    run: 'Running - sails eased right out',
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
