// ============================================================================
// Pure state machine of an ICOM IC-M330GE marine VHF/DSC radio.
// Behavior modeled 1:1 after the official instruction manual (IM_9/IM_10,
// icomeurope.com / icomuk.co.uk), see docs/design/sternik-radio.md for the
// research notes and the list of simplifications.
//
// No React in this file - the UI dispatches RadioEvent objects and renders
// from RadioState; the scenario engine observes (event, prev, next) triples.
// ============================================================================

/** Training vessel identities - scenario variants draw from this pool.
 *  The voice-grading API imports the same pool (single source of truth). */
export interface Vessel { name: string; mmsi: string; call: string }
export const VESSEL_POOL: Vessel[] = [
  { name: 'BALTIC STAR', mmsi: '261012345', call: 'SP 1234' },
  { name: 'ORKA', mmsi: '261054321', call: 'SP 5678' },
  { name: 'WIND DANCER', mmsi: '261098765', call: 'SP 9012' },
];
/** All positions stay in the 54N / 018E box so position checks hold. */
export const POSITION_POOL = [
  { lat: '54°30.5N', lon: '018°45.2E', spoken: '54 30.5 NORTH, 018 45.2 EAST' },
  { lat: '54°38.1N', lon: '018°33.7E', spoken: '54 38.1 NORTH, 018 33.7 EAST' },
  { lat: '54°25.9N', lon: '018°57.4E', spoken: '54 25.9 NORTH, 018 57.4 EAST' },
];

export interface Variant {
  vesselIdx: number;
  posIdx: number;
  /** persons on board, 2..6 */
  pob: number;
}
export const DEFAULT_VARIANT: Variant = { vesselIdx: 0, posIdx: 0, pob: 4 };

/** Legacy single-identity exports (default variant). */
export const VESSEL = VESSEL_POOL[0].name;
export const CALLSIGN = VESSEL_POOL[0].call;
export const MMSI = VESSEL_POOL[0].mmsi;
/** Polish coast station (since 1 Jan 2020; replaced Witowo Radio). */
export const COAST_STATION = 'POLISH RESCUE RADIO';
export const COAST_MMSI = '002618102';
export const POSITION = { lat: POSITION_POOL[0].lat, lon: POSITION_POOL[0].lon };

// --- channels (INT group, GE version has INT only) --------------------------

export interface ChannelDef {
  num: string;
  /** voice TX blocked (CH70 = DSC only). */
  noVoice?: boolean;
  /** low-power (1W) only per ITU (15, 17). */
  lowOnly?: boolean;
  label?: string;
}

export const CHANNELS: ChannelDef[] = [
  { num: '06' }, { num: '08' }, { num: '09' }, { num: '10' }, { num: '11' },
  { num: '12', label: 'Gdynia port/marina' }, { num: '13' }, { num: '14', label: 'Gdansk port' },
  { num: '15', lowOnly: true }, { num: '16', label: 'DISTRESS/CALLING' }, { num: '17', lowOnly: true },
  { num: '67' }, { num: '69' }, { num: '70', noVoice: true, label: 'DSC' }, { num: '71', label: 'VTS Zatoka Gdanska' },
  { num: '72' }, { num: '73' }, { num: '74' }, { num: '77' },
];
export const CH16_INDEX = CHANNELS.findIndex((c) => c.num === '16');

// --- DSC data ---------------------------------------------------------------

/** ITU-R M.493 designated natures (order/wording as on IC-M323 family;
 *  the M330 manual itself never enumerates the list - marked "probable"). */
export const NATURES = [
  'Undesignated', 'Fire,Explosion', 'Flooding', 'Collision', 'Grounding',
  'Capsizing', 'Sinking', 'Adrift', 'Abandoning ship', 'Piracy', 'Man Overboard',
] as const;
export type Nature = (typeof NATURES)[number];

export const OTHERDSC_TYPES = ['Individual', 'Group', 'All Ships', 'Test'] as const;
export const OTHERDSC_CATEGORIES = ['Routine', 'Safety', 'Urgency'] as const;

export const MENU_ITEMS = [
  'Distress', 'Other DSC', 'GPS', 'Configuration',
  'DSC Log', 'Radio Settings', 'DSC Settings', 'Radio Info',
] as const;

// --- state ------------------------------------------------------------------

export type ScreenId =
  | 'off' | 'standby' | 'volume' | 'squelch'
  | 'menu' | 'gps-info' | 'radio-info' | 'dsc-log' | 'stub-view'
  | 'distress-compose' | 'distress-nature'
  | 'distress-hold' | 'distress-tx' | 'distress-wait'
  | 'distress-ack' | 'distress-ack-done'
  | 'cancel-confirm' | 'cancel-tx' | 'cancel-voice' | 'cancel-done'
  | 'otherdsc-compose' | 'otherdsc-field' | 'otherdsc-sent';

export interface DeviceLogEntry {
  t: number;
  text: string;
  kind: 'tx' | 'rx' | 'ui';
}

export interface RadioState {
  power: boolean;
  screen: ScreenId;
  /** screen to return to from transient screens (volume/squelch/hold). */
  back: ScreenId;
  /** this run's vessel identity + GPS position (scenario variant). */
  vessel: Vessel;
  pos: { lat: string; lon: string };
  channelIndex: number;
  volume: number;   // 1..10 (range not documented in manual - simulator choice)
  squelch: number;  // 1..10
  hiPower: boolean;
  gpsValid: boolean;
  ptt: boolean;
  /** MMSI programmed (DSC softkeys hidden without it - per manual). */
  mmsiSet: boolean;

  softPage: number;
  menuCursor: number;
  stubTitle: string;

  natureIndex: number;
  natureCursor: number;
  composeCursor: number; // 0 = Nature row, 1 = Position row

  distressActive: boolean;
  /** elapsed auto-retransmissions of the unacknowledged alert. */
  retxCount: number;
  retxPaused: boolean;
  ackReceived: boolean;

  odType: number;     // index into OTHERDSC_TYPES
  odCategory: number; // index into OTHERDSC_CATEGORIES
  odCursor: number;   // 0 Type, 1 Category, 2 [Send]
  odField: 'type' | 'category' | null;
  odFieldCursor: number;
  /** last sent non-distress DSC call, e.g. "All Ships / Urgency". */
  odSent: { type: string; category: string } | null;

  deviceLog: DeviceLogEntry[];
  /** monotonically increasing beep counter - UI plays a beep on change. */
  beeps: number;
}

export type RadioEvent =
  | { type: 'dial-hold' }                 // hold [DIAL] 1 s = power on/off
  | { type: 'dial-push' }                 // push = volume, push again = squelch
  | { type: 'dial-rotate'; dir: 1 | -1 }
  | { type: 'key-16c' }
  | { type: 'soft'; index: number }
  | { type: 'soft-page'; dir: 1 | -1 }    // [<] / [>]
  | { type: 'up' } | { type: 'down' }
  | { type: 'ent' } | { type: 'clr' } | { type: 'menu' }
  | { type: 'distress-down' } | { type: 'distress-up' }
  | { type: 'distress-held' }             // UI timer confirms the 3 s hold
  | { type: 'distress-txdone' }           // UI timer: alert transmission finished
  | { type: 'cancel-txdone' }
  | { type: 'auto-retx' }                 // UI timer: 3.5-4.5 min repeat
  | { type: 'coast-ack' }                 // simulated coast-station DSC ACK
  | { type: 'alarm-off' }
  | { type: 'ptt-down' } | { type: 'ptt-up' };

export const INITIAL_RADIO: RadioState = {
  power: false, screen: 'off', back: 'standby',
  vessel: VESSEL_POOL[0], pos: { lat: POSITION_POOL[0].lat, lon: POSITION_POOL[0].lon },
  channelIndex: CH16_INDEX, volume: 8, squelch: 4,
  hiPower: true, gpsValid: true, ptt: false, mmsiSet: true,
  softPage: 0, menuCursor: 0, stubTitle: '',
  natureIndex: 0, natureCursor: 0, composeCursor: 0,
  distressActive: false, retxCount: 0, retxPaused: false, ackReceived: false,
  odType: 2, odCategory: 0, odCursor: 0, odField: null, odFieldCursor: 0, odSent: null,
  deviceLog: [], beeps: 0,
};

// --- softkeys ---------------------------------------------------------------

/** Softkey pages in standby (subset of the manual's set; DSC keys need MMSI). */
const STANDBY_SOFTKEYS: string[][] = [
  ['DISTRESS', 'OTHER DSC', 'HI/LO', 'CHAN'],
  ['SCAN', 'DW', 'AQUA', 'BKLT'],
  ['LOG', 'NAME', 'FAV', ''],
];

export function softkeys(s: RadioState): string[] {
  if (!s.power) return ['', '', '', ''];
  switch (s.screen) {
    case 'distress-wait':
      return s.retxPaused ? ['CANCEL', 'RESEND', 'RESUME', 'INFO'] : ['CANCEL', 'RESEND', 'PAUSE', 'INFO'];
    case 'distress-ack':
      return ['ALARM OFF', '', '', ''];
    case 'distress-ack-done':
      return ['STBY', 'HIST', 'INFO', ''];
    case 'cancel-confirm':
      return ['BACK', 'CONTINUE', '', ''];
    case 'cancel-voice':
      return ['FINISH', '', '', ''];
    case 'cancel-done':
      return ['STBY', '', '', ''];
    case 'otherdsc-sent':
      return ['STBY', '', '', ''];
    case 'standby': {
      const page = STANDBY_SOFTKEYS[s.softPage % STANDBY_SOFTKEYS.length];
      return page.map((k) => ((k === 'DISTRESS' || k === 'OTHER DSC') && !s.mmsiSet ? '' : k));
    }
    default:
      return ['', '', '', ''];
  }
}

// --- helpers ----------------------------------------------------------------

function log(s: RadioState, text: string, kind: DeviceLogEntry['kind'] = 'ui'): DeviceLogEntry[] {
  return [...s.deviceLog, { t: Date.now(), text, kind }];
}

export function channel(s: RadioState): ChannelDef {
  return CHANNELS[s.channelIndex];
}

/** Effective TX power: CH15/17 are hardware-limited to 1 W. */
export function effectivePower(s: RadioState): '25W' | '1W' {
  return channel(s).lowOnly || !s.hiPower ? '1W' : '25W';
}

function toStandby(s: RadioState): RadioState {
  return { ...s, screen: 'standby', softPage: 0 };
}

// --- reducer ----------------------------------------------------------------

export function radioReducer(s: RadioState, e: RadioEvent): RadioState {
  // Power toggle works everywhere.
  if (e.type === 'dial-hold') {
    if (s.power) return { ...INITIAL_RADIO, volume: s.volume, squelch: s.squelch };
    return {
      ...INITIAL_RADIO,
      power: true, screen: 'standby',
      volume: s.volume, squelch: s.squelch,
      deviceLog: [{ t: Date.now(), text: 'Power ON - watch on CH 16 / CH 70 (DSC)', kind: 'ui' }],
      beeps: s.beeps + 1,
    };
  }
  if (!s.power) return s;

  switch (e.type) {
    case 'dial-push': {
      if (s.screen === 'volume') return { ...s, screen: 'squelch' };
      if (s.screen === 'squelch') return { ...s, screen: s.back };
      if (s.screen === 'standby') return { ...s, screen: 'volume', back: 'standby' };
      return s;
    }

    case 'dial-rotate': {
      if (s.screen === 'volume') return { ...s, volume: Math.min(10, Math.max(1, s.volume + e.dir)) };
      if (s.screen === 'squelch') return { ...s, squelch: Math.min(10, Math.max(1, s.squelch + e.dir)) };
      if (s.screen === 'menu') {
        const n = MENU_ITEMS.length;
        return { ...s, menuCursor: (s.menuCursor + e.dir + n) % n };
      }
      if (s.screen === 'distress-nature') {
        const n = NATURES.length;
        return { ...s, natureCursor: (s.natureCursor + e.dir + n) % n };
      }
      if (s.screen === 'standby') {
        const n = CHANNELS.length;
        const channelIndex = (s.channelIndex + e.dir + n) % n;
        return { ...s, channelIndex, deviceLog: log(s, `CH ${CHANNELS[channelIndex].num}`) };
      }
      return s;
    }

    case 'up':
    case 'down': {
      const dir = e.type === 'up' ? -1 : 1;
      if (s.screen === 'menu') {
        const n = MENU_ITEMS.length;
        return { ...s, menuCursor: (s.menuCursor + dir + n) % n };
      }
      if (s.screen === 'distress-nature') {
        const n = NATURES.length;
        return { ...s, natureCursor: (s.natureCursor + dir + n) % n };
      }
      if (s.screen === 'distress-compose') {
        return { ...s, composeCursor: s.composeCursor === 0 ? 1 : 0 };
      }
      if (s.screen === 'otherdsc-compose') {
        const n = 3;
        return { ...s, odCursor: (s.odCursor + dir + n) % n };
      }
      if (s.screen === 'otherdsc-field') {
        const n = s.odField === 'type' ? OTHERDSC_TYPES.length : OTHERDSC_CATEGORIES.length;
        return { ...s, odFieldCursor: (s.odFieldCursor + dir + n) % n };
      }
      if (s.screen === 'standby') {
        // channel up/down (same as rotating the dial)
        const n = CHANNELS.length;
        const channelIndex = (s.channelIndex + (e.type === 'up' ? 1 : -1) + n) % n;
        return { ...s, channelIndex, deviceLog: log(s, `CH ${CHANNELS[channelIndex].num}`) };
      }
      return s;
    }

    case 'key-16c': {
      if (s.screen === 'standby' || s.screen === 'menu' || s.screen === 'gps-info'
        || s.screen === 'radio-info' || s.screen === 'dsc-log' || s.screen === 'stub-view') {
        return { ...toStandby(s), channelIndex: CH16_INDEX, deviceLog: log(s, 'CH 16 (distress/calling)'), beeps: s.beeps + 1 };
      }
      return s;
    }

    case 'menu': {
      if (s.screen === 'menu') return toStandby(s);
      if (s.screen === 'standby') return { ...s, screen: 'menu', menuCursor: 0 };
      return s;
    }

    case 'clr': {
      switch (s.screen) {
        case 'menu': return toStandby(s);
        case 'gps-info': case 'radio-info': case 'dsc-log': case 'stub-view': return { ...s, screen: 'menu' };
        case 'distress-nature': return { ...s, screen: 'distress-compose' };
        case 'distress-compose': return toStandby(s);
        case 'otherdsc-field': return { ...s, screen: 'otherdsc-compose' };
        case 'otherdsc-compose': return toStandby(s);
        case 'cancel-confirm': return { ...s, screen: 'distress-wait' };
        default: return s;
      }
    }

    case 'ent': {
      if (s.screen === 'menu') {
        const item = MENU_ITEMS[s.menuCursor];
        if (item === 'Distress') return { ...s, screen: 'distress-compose', composeCursor: 0 };
        if (item === 'Other DSC') return { ...s, screen: 'otherdsc-compose', odCursor: 0 };
        if (item === 'GPS') return { ...s, screen: 'gps-info' };
        if (item === 'Radio Info') return { ...s, screen: 'radio-info' };
        if (item === 'DSC Log') return { ...s, screen: 'dsc-log' };
        return { ...s, screen: 'stub-view', stubTitle: item };
      }
      if (s.screen === 'distress-compose') {
        if (s.composeCursor === 0) return { ...s, screen: 'distress-nature', natureCursor: s.natureIndex };
        return s; // Position row: GPS valid -> nothing to enter (manual entry not simulated)
      }
      if (s.screen === 'distress-nature') {
        return { ...s, natureIndex: s.natureCursor, screen: 'distress-compose', beeps: s.beeps + 1 };
      }
      if (s.screen === 'otherdsc-compose') {
        if (s.odCursor === 0) return { ...s, screen: 'otherdsc-field', odField: 'type', odFieldCursor: s.odType };
        if (s.odCursor === 1) return { ...s, screen: 'otherdsc-field', odField: 'category', odFieldCursor: s.odCategory };
        // Send. All Ships announcement designates CH16 for the voice message.
        const type = OTHERDSC_TYPES[s.odType];
        const category = OTHERDSC_CATEGORIES[s.odCategory];
        return {
          ...s,
          screen: 'otherdsc-sent',
          channelIndex: CH16_INDEX,
          odSent: { type, category },
          deviceLog: log(s, `TX DSC ${type} / ${category} on CH 70 -> voice on CH 16`, 'tx'),
          beeps: s.beeps + 1,
        };
      }
      if (s.screen === 'otherdsc-field') {
        if (s.odField === 'type') return { ...s, odType: s.odFieldCursor, screen: 'otherdsc-compose', odField: null };
        return { ...s, odCategory: s.odFieldCursor, screen: 'otherdsc-compose', odField: null };
      }
      return s;
    }

    case 'soft': {
      const keys = softkeys(s);
      const key = keys[e.index];
      if (!key) return s;
      switch (key) {
        case 'DISTRESS': return { ...s, screen: 'distress-compose', composeCursor: 0 };
        case 'OTHER DSC': return { ...s, screen: 'otherdsc-compose', odCursor: 0 };
        case 'HI/LO': return { ...s, hiPower: !s.hiPower, deviceLog: log(s, `Power ${!s.hiPower ? '25W' : '1W'}`) };
        case 'CHAN': return toStandby(s);
        case 'SCAN': case 'DW': case 'AQUA': case 'BKLT': case 'LOG': case 'NAME': case 'FAV':
          return { ...s, deviceLog: log(s, `${key}: not used in training scenarios`), beeps: s.beeps + 1 };
        case 'CANCEL': return { ...s, screen: 'cancel-confirm' };
        case 'RESEND': return { ...s, screen: 'distress-tx', deviceLog: log(s, 'Resending Distress Alert (CH 70)', 'tx') };
        case 'PAUSE': return { ...s, retxPaused: true };
        case 'RESUME': return { ...s, retxPaused: false };
        case 'INFO': case 'HIST': return { ...s, deviceLog: log(s, `${key}: sent-call info`) };
        case 'BACK': return { ...s, screen: 'distress-wait' };
        case 'CONTINUE':
          return { ...s, screen: 'cancel-tx', deviceLog: log(s, 'TX DSC Distress Cancel (CH 70)', 'tx') };
        case 'ALARM OFF':
          return {
            ...s, screen: 'distress-ack-done', channelIndex: CH16_INDEX,
            deviceLog: log(s, 'Alarm off - CH 16 selected. Hold PTT and explain the situation.', 'ui'),
          };
        case 'FINISH':
          // Manual fidelity: FINISH closes the voice-cancel step, then a
          // separate [STBY] press ends the whole Distress Cancel call.
          return { ...s, screen: 'cancel-done' };
        case 'STBY':
          return { ...toStandby(s), distressActive: false, ackReceived: false, retxCount: 0, odSent: null };
        default: return s;
      }
    }

    case 'soft-page': {
      if (s.screen !== 'standby') return s;
      const n = STANDBY_SOFTKEYS.length;
      return { ...s, softPage: (s.softPage + e.dir + n) % n };
    }

    // --- physical red DISTRESS key (under the cover) ------------------------
    case 'distress-down': {
      if (s.distressActive || s.screen === 'distress-tx' || s.screen === 'cancel-tx') return s;
      // Never return into a transient overlay (volume/squelch) - that would
      // corrupt the dial's own `back` cycle and trap the user.
      const from = s.screen === 'distress-hold' ? s.back : s.screen;
      const back = from === 'volume' || from === 'squelch' ? 'standby' : from;
      return { ...s, screen: 'distress-hold', back };
    }
    case 'distress-up': {
      if (s.screen !== 'distress-hold') return s;
      return { ...s, screen: s.back }; // released too early
    }
    case 'distress-held': {
      if (s.screen !== 'distress-hold') return s;
      return {
        ...s,
        screen: 'distress-tx',
        distressActive: true,
        deviceLog: log(
          s,
          `TX DSC DISTRESS on CH 70: MMSI ${s.vessel.mmsi}, nature ${NATURES[s.natureIndex]}, ` +
          (s.gpsValid ? `pos ${s.pos.lat} ${s.pos.lon}` : 'NO POSITION (no GPS!)'),
          'tx',
        ),
        beeps: s.beeps + 1,
      };
    }
    case 'distress-txdone': {
      if (s.screen !== 'distress-tx') return s;
      return { ...s, screen: 'distress-wait', retxPaused: false };
    }
    case 'cancel-txdone': {
      if (s.screen !== 'cancel-tx') return s;
      return {
        ...s, screen: 'cancel-voice', channelIndex: CH16_INDEX,
        deviceLog: log(s, 'CH 16 selected. Voice cancel: press PTT and say: All stations...', 'ui'),
      };
    }
    case 'auto-retx': {
      if (s.screen !== 'distress-wait' || s.retxPaused || s.ackReceived) return s;
      return { ...s, retxCount: s.retxCount + 1, deviceLog: log(s, 'Auto re-TX of Distress Alert (CH 70)', 'tx') };
    }
    case 'coast-ack': {
      if (!s.distressActive || s.ackReceived) return s;
      return {
        ...s, ackReceived: true, screen: 'distress-ack',
        deviceLog: log(s, `RX DSC DISTRESS ACK from ${COAST_STATION} (${COAST_MMSI}) - alarm sounds`, 'rx'),
        beeps: s.beeps + 1,
      };
    }

    // --- PTT ----------------------------------------------------------------
    case 'ptt-down': {
      if (channel(s).noVoice) {
        return { ...s, deviceLog: log(s, 'CH 70 is DSC only - voice TX blocked'), beeps: s.beeps + 1 };
      }
      return { ...s, ptt: true, deviceLog: log(s, `PTT TX on CH ${channel(s).num} (${effectivePower(s)})`, 'tx') };
    }
    case 'ptt-up': {
      return { ...s, ptt: false };
    }

    default:
      return s;
  }
}
