// Pure state machine shared by the IC-M330GE and IC-M323 training panels.
// Hardware behavior follows the official ICOM manuals. Scenario timing is
// accelerated by the page component, while displayed radio timers stay exact.

export type RadioModel = 'M330' | 'M323';

export interface RadioProfile {
  model: RadioModel;
  nameplate: string;
  clearLabel: 'CLR' | 'CLEAR';
  menuItems: readonly string[];
  retxSeconds: number;
  cancelRequiresStandby: boolean;
  maxVolume: number;
  maxBacklight: number;
}

const M330_MENU = [
  'Distress', 'Other DSC', 'GPS', 'Configuration',
  'DSC Log', 'Radio Settings', 'DSC Settings', 'Radio Info',
] as const;
const M323_MENU = ['DSC Calls', 'DSC Settings', 'Radio Settings', 'Configuration', 'MMSI/GPS Info'] as const;

export const MENU_ITEMS = M330_MENU;
export const RADIO_PROFILES: Record<RadioModel, RadioProfile> = {
  M330: {
    model: 'M330',
    nameplate: 'ICOM · IC-M330GE',
    clearLabel: 'CLR',
    menuItems: M330_MENU,
    retxSeconds: 246,
    cancelRequiresStandby: true,
    maxVolume: 20,
    maxBacklight: 7,
  },
  M323: {
    model: 'M323',
    nameplate: 'ICOM · IC-M323',
    clearLabel: 'CLEAR',
    menuItems: M323_MENU,
    retxSeconds: 222,
    cancelRequiresStandby: false,
    maxVolume: 20,
    maxBacklight: 7,
  },
};

export function radioProfile(model: RadioModel): RadioProfile {
  return RADIO_PROFILES[model];
}

export interface Vessel { name: string; mmsi: string; call: string }
export const VESSEL_POOL: Vessel[] = [
  { name: 'BALTIC STAR', mmsi: '261012345', call: 'SP 1234' },
  { name: 'ORKA', mmsi: '261054321', call: 'SP 5678' },
  { name: 'WIND DANCER', mmsi: '261098765', call: 'SP 9012' },
];
export const POSITION_POOL = [
  { lat: '54°30.5N', lon: '018°45.2E', spoken: '54 30.5 NORTH, 018 45.2 EAST' },
  { lat: '54°38.1N', lon: '018°33.7E', spoken: '54 38.1 NORTH, 018 33.7 EAST' },
  { lat: '54°25.9N', lon: '018°57.4E', spoken: '54 25.9 NORTH, 018 57.4 EAST' },
];

export interface Variant {
  vesselIdx: number;
  posIdx: number;
  pob: number;
}
export const DEFAULT_VARIANT: Variant = { vesselIdx: 0, posIdx: 0, pob: 4 };

export const VESSEL = VESSEL_POOL[0].name;
export const CALLSIGN = VESSEL_POOL[0].call;
export const MMSI = VESSEL_POOL[0].mmsi;
export const COAST_STATION = 'POLISH RESCUE RADIO';
export const COAST_MMSI = '002618102';
export const POSITION = { lat: POSITION_POOL[0].lat, lon: POSITION_POOL[0].lon };

export interface ChannelDef {
  num: string;
  noVoice?: boolean;
  lowOnly?: boolean;
  label?: string;
}

export const CHANNELS: ChannelDef[] = [
  { num: '01' }, { num: '02' }, { num: '03' }, { num: '04' }, { num: '05' },
  { num: '06' }, { num: '07' }, { num: '08' }, { num: '09' }, { num: '10' },
  { num: '11' }, { num: '12', label: 'Gdynia port/marina' }, { num: '13' },
  { num: '14', label: 'Gdansk port' }, { num: '15', lowOnly: true },
  { num: '16', label: 'DISTRESS/CALLING' }, { num: '17', lowOnly: true },
  { num: '18' }, { num: '19' }, { num: '20' }, { num: '21' }, { num: '22' },
  { num: '23' }, { num: '24' }, { num: '25' }, { num: '26' }, { num: '27' },
  { num: '28' }, { num: '60' }, { num: '61' }, { num: '62' }, { num: '63' },
  { num: '64' }, { num: '65' }, { num: '66' }, { num: '67' }, { num: '68' },
  { num: '69' }, { num: '70', noVoice: true, label: 'DSC' },
  { num: '71', label: 'VTS Zatoka Gdanska' }, { num: '72' }, { num: '73' },
  { num: '74' }, { num: '75', lowOnly: true }, { num: '76', lowOnly: true },
  { num: '77' }, { num: '78' }, { num: '79' }, { num: '80' }, { num: '81' },
  { num: '82' }, { num: '83' }, { num: '84' }, { num: '85' }, { num: '86' },
  { num: '87' }, { num: '88' },
];
export const CH16_INDEX = CHANNELS.findIndex((c) => c.num === '16');

export const NATURES = [
  'Undesignated', 'Fire,Explosion', 'Flooding', 'Collision', 'Grounding',
  'Capsizing', 'Sinking', 'Adrift', 'Abandoning ship', 'Piracy', 'Man Overboard',
] as const;
export type Nature = (typeof NATURES)[number];

export const OTHERDSC_TYPES = ['Individual', 'Group', 'All Ships', 'Test'] as const;
export const OTHERDSC_CATEGORIES = ['Routine', 'Safety', 'Urgency'] as const;
export const DSC_ADDRESSES = [
  { label: 'POLISH RESCUE RADIO', mmsi: COAST_MMSI },
  { label: 'LYNGBY RADIO', mmsi: '002191000' },
  { label: 'TRAINING SHIP', mmsi: '261111111' },
] as const;
export const DSC_VOICE_CHANNELS = ['06', '08', '09', '12', '13', '16', '69', '71', '72', '77'] as const;

export type ScreenId =
  | 'off' | 'standby' | 'volume' | 'squelch' | 'channel-select' | 'backlight'
  | 'menu' | 'm323-dsc-calls' | 'gps-info' | 'radio-info' | 'dsc-log' | 'stub-view'
  | 'distress-compose' | 'distress-nature' | 'distress-hold' | 'distress-tx'
  | 'distress-wait' | 'distress-ack' | 'distress-ack-done'
  | 'cancel-confirm' | 'cancel-tx' | 'cancel-voice' | 'cancel-done'
  | 'otherdsc-compose' | 'otherdsc-field' | 'otherdsc-sent' | 'otherdsc-ack'
  | 'rx-distress-alert' | 'rx-individual-call';

/** A distress alert received FROM another vessel (receiving-side scenarios). */
export const RX_DISTRESS = {
  name: 'NEPTUN',
  mmsi: '261099999',
  pos: { lat: '54°40.0N', lon: '018°50.0E' },
  spoken: '54 40 NORTH, 018 50 EAST',
  nature: 'Sinking',
  pob: 3,
} as const;
/** An incoming routine individual DSC call, proposing a working channel. */
export const RX_CALLER = { label: 'TRAINING SHIP', mmsi: '261111111', channel: '72' } as const;

export interface DeviceLogEntry {
  t: number;
  text: string;
  kind: 'tx' | 'rx' | 'ui';
}

export type OtherDscField = 'type' | 'address' | 'category' | 'channel';

export interface RadioState {
  model: RadioModel;
  power: boolean;
  screen: ScreenId;
  back: ScreenId;
  vessel: Vessel;
  pos: { lat: string; lon: string };
  channelIndex: number;
  callChannelIndex: number;
  volume: number;
  squelch: number;
  backlight: number;
  hiPower: boolean;
  gpsValid: boolean;
  ptt: boolean;
  mmsiSet: boolean;
  scanActive: boolean;
  dualWatch: boolean;
  aquaActive: boolean;
  favoriteChannels: string[];
  softPage: number;
  menuCursor: number;
  m323CallCursor: number;
  stubTitle: string;
  natureIndex: number;
  natureCursor: number;
  composeCursor: number;
  distressActive: boolean;
  retxCount: number;
  retxPaused: boolean;
  ackReceived: boolean;
  odType: number;
  odAddress: number;
  odCategory: number;
  odChannel: number;
  odCursor: number;
  odField: OtherDscField | null;
  odFieldCursor: number;
  odAwaitingAck: boolean;
  odSent: { type: string; address: string; category: string; channel: string } | null;
  /** an inbound distress alert being displayed (receive-side scenarios). */
  rxDistress: { name: string; mmsi: string; spoken: string; nature: string; pob: number } | null;
  /** an inbound routine individual DSC call being displayed. */
  rxCall: { label: string; mmsi: string; channel: string } | null;
  deviceLog: DeviceLogEntry[];
  beeps: number;
}

export type RadioEvent =
  | { type: 'dial-hold' }
  | { type: 'dial-push' }
  | { type: 'dial-rotate'; dir: 1 | -1 }
  | { type: 'key-16c' }
  | { type: 'key-16c-hold' }
  | { type: 'soft'; index: number }
  | { type: 'soft-page'; dir: 1 | -1 }
  | { type: 'up' } | { type: 'down' }
  | { type: 'ent' } | { type: 'clr' } | { type: 'menu' }
  | { type: 'distress-down' } | { type: 'distress-up' }
  | { type: 'distress-held' } | { type: 'distress-txdone' }
  | { type: 'cancel-txdone' } | { type: 'auto-retx' }
  | { type: 'coast-ack' } | { type: 'otherdsc-ack' }
  | { type: 'scan-tick' }
  | { type: 'alarm-off' }
  | { type: 'aqua-down' } | { type: 'aqua-up' }
  | { type: 'ptt-down' } | { type: 'ptt-up' };

export function createInitialRadio(
  model: RadioModel = 'M330',
  vessel: Vessel = VESSEL_POOL[0],
  pos: { lat: string; lon: string } = POSITION_POOL[0],
): RadioState {
  return {
    model, power: false, screen: 'off', back: 'standby', vessel,
    pos: { lat: pos.lat, lon: pos.lon }, channelIndex: CH16_INDEX,
    callChannelIndex: CHANNELS.findIndex((c) => c.num === '06'),
    volume: 16, squelch: 4, backlight: 5, hiPower: true, gpsValid: true,
    ptt: false, mmsiSet: true, scanActive: false, dualWatch: false, aquaActive: false,
    favoriteChannels: ['06', '12', '16'], softPage: 0, menuCursor: 0, m323CallCursor: 0, stubTitle: '',
    natureIndex: 0, natureCursor: 0, composeCursor: 0,
    distressActive: false, retxCount: 0, retxPaused: false, ackReceived: false,
    odType: 2, odAddress: 0, odCategory: 0,
    odChannel: DSC_VOICE_CHANNELS.findIndex((c) => c === '16'),
    odCursor: 0, odField: null, odFieldCursor: 0, odAwaitingAck: false,
    odSent: null, rxDistress: null, rxCall: null, deviceLog: [], beeps: 0,
  };
}

export const INITIAL_RADIO: RadioState = createInitialRadio();

const M330_STANDBY_SOFTKEYS: string[][] = [
  ['DISTRESS', 'OTHER DSC', 'HI/LO', 'CHAN'],
  ['SCAN', 'DW', 'AQUA', 'BKLT'],
  ['LOG', 'NAME', 'FAV', ''],
];
const M323_STANDBY_SOFTKEYS: string[][] = [
  ['SCAN', 'DW', 'HI/LO', 'CHAN'],
  ['AQUA', 'FAV', 'NAME', 'BKLT'],
  ['LOG', '', '', ''],
];

function standbySoftkeyPages(s: RadioState): string[][] {
  return s.model === 'M323' ? M323_STANDBY_SOFTKEYS : M330_STANDBY_SOFTKEYS;
}

export function menuItems(s: RadioState): readonly string[] {
  return radioProfile(s.model).menuItems;
}

export function softkeys(s: RadioState): string[] {
  if (!s.power) return ['', '', '', ''];
  switch (s.screen) {
    case 'distress-wait':
      return s.retxPaused ? ['CANCEL', 'RESEND', 'RESUME', 'INFO'] : ['CANCEL', 'RESEND', 'PAUSE', 'INFO'];
    case 'distress-ack': return ['ALARM OFF', '', '', ''];
    case 'distress-ack-done': return ['STBY', 'HIST', 'INFO', ''];
    case 'cancel-confirm': return ['BACK', 'CONTINUE', '', ''];
    case 'cancel-voice': return ['FINISH', '', '', ''];
    case 'cancel-done': return ['STBY', '', '', ''];
    case 'otherdsc-sent': return ['STBY', '', '', ''];
    case 'otherdsc-ack': return ['ALARM OFF', 'STBY', '', ''];
    case 'rx-distress-alert': return ['ALARM OFF', '', '', ''];
    case 'rx-individual-call': return ['ACCEPT', 'REFUSE', '', ''];
    case 'standby': {
      const pages = standbySoftkeyPages(s);
      const page = pages[s.softPage % pages.length];
      return page.map((key) => ((key === 'DISTRESS' || key === 'OTHER DSC') && !s.mmsiSet ? '' : key));
    }
    default: return ['', '', '', ''];
  }
}

function log(s: RadioState, text: string, kind: DeviceLogEntry['kind'] = 'ui'): DeviceLogEntry[] {
  return [...s.deviceLog, { t: Date.now(), text, kind }];
}

export function channel(s: RadioState): ChannelDef {
  return CHANNELS[s.channelIndex] ?? CHANNELS[CH16_INDEX];
}

export function effectivePower(s: RadioState): '25W' | '1W' {
  return channel(s).lowOnly || !s.hiPower ? '1W' : '25W';
}

function toStandby(s: RadioState): RadioState {
  return { ...s, screen: 'standby', softPage: 0, ptt: false };
}

function moveChannel(s: RadioState, delta: number): RadioState {
  const index = (s.channelIndex + delta + CHANNELS.length) % CHANNELS.length;
  return { ...s, channelIndex: index, deviceLog: log(s, `CH ${CHANNELS[index].num}`) };
}

export function dscFieldValues(s: RadioState): readonly string[] {
  if (s.odField === 'type') return OTHERDSC_TYPES;
  if (s.odField === 'address') return DSC_ADDRESSES.map((a) => `${a.label} ${a.mmsi}`);
  if (s.odField === 'category') return OTHERDSC_CATEGORIES;
  return DSC_VOICE_CHANNELS;
}

export function otherDscRows(s: RadioState): OtherDscField[] {
  const type = OTHERDSC_TYPES[s.odType];
  if (s.model === 'M323') {
    if (type === 'All Ships') return ['category', 'channel'];
    if (type === 'Test') return ['address'];
    return ['address', 'channel'];
  }
  if (type === 'All Ships') return ['type', 'category', 'channel'];
  if (type === 'Test') return ['type', 'address'];
  return ['type', 'address', 'channel'];
}

export function radioReducer(s: RadioState, e: RadioEvent): RadioState {
  if (e.type === 'dial-hold') {
    if (s.power) {
      return {
        ...createInitialRadio(s.model, s.vessel, s.pos),
        volume: s.volume, squelch: s.squelch, backlight: s.backlight,
        callChannelIndex: s.callChannelIndex, favoriteChannels: s.favoriteChannels,
      };
    }
    return {
      ...createInitialRadio(s.model, s.vessel, s.pos),
      power: true, screen: 'standby', volume: s.volume, squelch: s.squelch,
      backlight: s.backlight, callChannelIndex: s.callChannelIndex,
      favoriteChannels: s.favoriteChannels,
      deviceLog: [{ t: Date.now(), text: 'Power ON - watch on CH 16 / CH 70 (DSC)', kind: 'ui' }],
      beeps: s.beeps + 1,
    };
  }
  if (!s.power) return s;

  switch (e.type) {
    case 'dial-push': {
      if (s.model === 'M323') {
        if (s.screen === 'volume') return { ...s, screen: 'squelch' };
        if (s.screen === 'squelch') return { ...s, screen: 'channel-select' };
        if (s.screen === 'channel-select') return { ...s, screen: 'backlight' };
        if (s.screen === 'backlight') return { ...s, screen: s.back };
      } else {
        if (s.screen === 'volume') return { ...s, screen: 'squelch' };
        if (s.screen === 'squelch') return { ...s, screen: s.back };
      }
      if (s.screen === 'standby') return { ...s, screen: 'volume', back: 'standby' };
      return s;
    }

    case 'dial-rotate': {
      if (s.screen === 'volume') return { ...s, volume: Math.min(radioProfile(s.model).maxVolume, Math.max(0, s.volume + e.dir)) };
      if (s.screen === 'squelch') return { ...s, squelch: Math.min(10, Math.max(0, s.squelch + e.dir)) };
      if (s.screen === 'channel-select') return moveChannel(s, e.dir);
      if (s.screen === 'backlight') return { ...s, backlight: Math.min(radioProfile(s.model).maxBacklight, Math.max(0, s.backlight + e.dir)) };
      if (s.screen === 'menu') {
        const n = menuItems(s).length;
        return { ...s, menuCursor: (s.menuCursor + e.dir + n) % n };
      }
      if (s.screen === 'distress-nature') {
        const n = NATURES.length;
        return { ...s, natureCursor: (s.natureCursor + e.dir + n) % n };
      }
      if (s.screen === 'm323-dsc-calls') {
        const n = 5;
        return { ...s, m323CallCursor: (s.m323CallCursor + e.dir + n) % n };
      }
      if (s.screen === 'otherdsc-field') {
        const n = dscFieldValues(s).length;
        return { ...s, odFieldCursor: (s.odFieldCursor + e.dir + n) % n };
      }
      if (s.screen === 'standby') {
        return { ...s, screen: 'volume', back: 'standby', volume: Math.min(radioProfile(s.model).maxVolume, Math.max(0, s.volume + e.dir)) };
      }
      return s;
    }

    case 'up':
    case 'down': {
      const listDir = e.type === 'up' ? -1 : 1;
      if (s.screen === 'menu') {
        const n = menuItems(s).length;
        return { ...s, menuCursor: (s.menuCursor + listDir + n) % n };
      }
      if (s.screen === 'distress-nature') {
        const n = NATURES.length;
        return { ...s, natureCursor: (s.natureCursor + listDir + n) % n };
      }
      if (s.screen === 'distress-compose') return { ...s, composeCursor: s.composeCursor === 0 ? 1 : 0 };
      if (s.screen === 'm323-dsc-calls') {
        const n = 5;
        return { ...s, m323CallCursor: (s.m323CallCursor + listDir + n) % n };
      }
      if (s.screen === 'otherdsc-compose') {
        const n = otherDscRows(s).length + 1;
        return { ...s, odCursor: (s.odCursor + listDir + n) % n };
      }
      if (s.screen === 'otherdsc-field') {
        const n = dscFieldValues(s).length;
        return { ...s, odFieldCursor: (s.odFieldCursor + listDir + n) % n };
      }
      if (s.screen === 'standby' || s.screen === 'channel-select') return moveChannel(s, e.type === 'up' ? 1 : -1);
      return s;
    }

    case 'key-16c': {
      const allowed: ScreenId[] = ['standby', 'menu', 'm323-dsc-calls', 'gps-info', 'radio-info', 'dsc-log', 'stub-view', 'volume', 'squelch', 'channel-select', 'backlight'];
      if (!allowed.includes(s.screen)) return s;
      return { ...toStandby(s), channelIndex: CH16_INDEX, deviceLog: log(s, 'CH 16 (distress/calling)'), beeps: s.beeps + 1 };
    }
    case 'key-16c-hold':
      return { ...toStandby(s), channelIndex: s.callChannelIndex, deviceLog: log(s, `Call channel CH ${CHANNELS[s.callChannelIndex].num}`), beeps: s.beeps + 1 };

    case 'menu':
      if (s.screen === 'menu') return toStandby(s);
      if (s.screen === 'standby') return { ...s, screen: 'menu', menuCursor: 0 };
      return s;

    case 'clr': {
      if (['volume', 'squelch', 'channel-select', 'backlight'].includes(s.screen)) return { ...s, screen: s.back };
      switch (s.screen) {
        case 'menu': return toStandby(s);
        case 'gps-info': case 'radio-info': case 'dsc-log': case 'stub-view': case 'm323-dsc-calls': return { ...s, screen: 'menu' };
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
        const item = menuItems(s)[s.menuCursor];
        if (item === 'DSC Calls') return { ...s, screen: 'm323-dsc-calls', m323CallCursor: 0 };
        if (item === 'Distress') return { ...s, screen: 'distress-compose', composeCursor: 0 };
        if (item === 'Other DSC') return { ...s, screen: 'otherdsc-compose', odCursor: 0 };
        if (item === 'GPS') return { ...s, screen: 'gps-info' };
        if (item === 'Radio Info') return { ...s, screen: 'radio-info' };
        if (item === 'MMSI/GPS Info') return { ...s, screen: 'radio-info' };
        if (item === 'DSC Log') return { ...s, screen: 'dsc-log' };
        return { ...s, screen: 'stub-view', stubTitle: item };
      }
      if (s.screen === 'distress-compose') {
        if (s.composeCursor === 0) return { ...s, screen: 'distress-nature', natureCursor: s.natureIndex };
        return s;
      }
      if (s.screen === 'm323-dsc-calls') {
        if (s.m323CallCursor === 3) return { ...s, screen: 'distress-compose', composeCursor: 0 };
        const typeByCursor = [0, 1, 2, 2, 3] as const;
        return { ...s, screen: 'otherdsc-compose', odType: typeByCursor[s.m323CallCursor], odCursor: 0 };
      }
      if (s.screen === 'distress-nature') return { ...s, natureIndex: s.natureCursor, screen: 'distress-compose', beeps: s.beeps + 1 };
      if (s.screen === 'otherdsc-compose') {
        const rows = otherDscRows(s);
        if (s.odCursor < rows.length) {
          const field = rows[s.odCursor];
          const cursor = field === 'type' ? s.odType : field === 'address' ? s.odAddress : field === 'category' ? s.odCategory : s.odChannel;
          return { ...s, screen: 'otherdsc-field', odField: field, odFieldCursor: cursor };
        }
        const type = OTHERDSC_TYPES[s.odType];
        const category = type === 'Test' ? 'Routine' : OTHERDSC_CATEGORIES[s.odCategory];
        const address = type === 'All Ships' ? 'ALL SHIPS' : `${DSC_ADDRESSES[s.odAddress].label} ${DSC_ADDRESSES[s.odAddress].mmsi}`;
        const voiceChannel = DSC_VOICE_CHANNELS[s.odChannel];
        const channelIndex = CHANNELS.findIndex((c) => c.num === voiceChannel);
        const awaiting = type === 'Individual' || type === 'Test';
        return {
          ...s, screen: 'otherdsc-sent', channelIndex, odAwaitingAck: awaiting,
          odSent: { type, address, category, channel: voiceChannel },
          deviceLog: log(s, `TX DSC ${type} / ${category} to ${address} on CH 70 -> CH ${voiceChannel}`, 'tx'),
          beeps: s.beeps + 1,
        };
      }
      if (s.screen === 'otherdsc-field') {
        const base = { ...s, screen: 'otherdsc-compose' as const, odField: null };
        if (s.odField === 'type') return { ...base, odType: s.odFieldCursor, odCursor: 0 };
        if (s.odField === 'address') return { ...base, odAddress: s.odFieldCursor };
        if (s.odField === 'category') return { ...base, odCategory: s.odFieldCursor };
        return { ...base, odChannel: s.odFieldCursor };
      }
      return s;
    }

    case 'soft': {
      const key = softkeys(s)[e.index];
      if (!key) return s;
      switch (key) {
        case 'DISTRESS': return { ...s, screen: 'distress-compose', composeCursor: 0 };
        case 'OTHER DSC': return { ...s, screen: 'otherdsc-compose', odCursor: 0 };
        case 'HI/LO': return { ...s, hiPower: !s.hiPower, deviceLog: log(s, `Power ${!s.hiPower ? '25W' : '1W'}`) };
        case 'CHAN': return { ...s, screen: 'channel-select', back: 'standby' };
        case 'SCAN': return { ...s, scanActive: !s.scanActive, dualWatch: false, deviceLog: log(s, `SCAN ${!s.scanActive ? 'ON' : 'OFF'}`), beeps: s.beeps + 1 };
        case 'DW': return { ...s, dualWatch: !s.dualWatch, scanActive: false, deviceLog: log(s, `DUAL WATCH ${!s.dualWatch ? 'ON' : 'OFF'}: CH ${channel(s).num} + CH 16`), beeps: s.beeps + 1 };
        case 'BKLT': return { ...s, screen: 'backlight', back: 'standby' };
        case 'FAV': {
          const num = channel(s).num;
          const favoriteChannels = s.favoriteChannels.includes(num) ? s.favoriteChannels.filter((c) => c !== num) : [...s.favoriteChannels, num];
          return { ...s, favoriteChannels, deviceLog: log(s, `${favoriteChannels.includes(num) ? 'Favorite' : 'Unfavorite'} CH ${num}`), beeps: s.beeps + 1 };
        }
        case 'LOG': return { ...s, screen: 'dsc-log' };
        case 'AQUA': return s;
        case 'NAME': return { ...s, deviceLog: log(s, `${key}: configuration view`), beeps: s.beeps + 1 };
        case 'CANCEL': return { ...s, screen: 'cancel-confirm' };
        case 'RESEND': return { ...s, screen: 'distress-tx', deviceLog: log(s, 'Resending Distress Alert (CH 70)', 'tx') };
        case 'PAUSE': return { ...s, retxPaused: true };
        case 'RESUME': return { ...s, retxPaused: false };
        case 'INFO': case 'HIST': return { ...s, deviceLog: log(s, `${key}: sent-call info`) };
        case 'BACK': return { ...s, screen: 'distress-wait' };
        case 'CONTINUE': return { ...s, screen: 'cancel-tx', deviceLog: log(s, 'TX DSC Distress Cancel (CH 70)', 'tx') };
        case 'ALARM OFF':
          if (s.screen === 'otherdsc-ack') return { ...s, screen: 'otherdsc-sent', odAwaitingAck: false };
          if (s.screen === 'rx-distress-alert') return { ...toStandby(s), channelIndex: CH16_INDEX, deviceLog: log(s, 'Alarm off - watch on CH 16. Listen; acknowledge by voice only if no coast station replies.') };
          return { ...s, screen: 'distress-ack-done', channelIndex: CH16_INDEX, deviceLog: log(s, 'Alarm off - CH 16 selected. Hold PTT and explain the situation.') };
        case 'ACCEPT': {
          if (s.screen !== 'rx-individual-call' || !s.rxCall) return s;
          const idx = CHANNELS.findIndex((c) => c.num === s.rxCall!.channel);
          return { ...toStandby(s), channelIndex: idx >= 0 ? idx : s.channelIndex, deviceLog: log(s, `Accepted call from ${s.rxCall.label} - CH ${s.rxCall.channel} selected`) };
        }
        case 'REFUSE':
          return s.screen === 'rx-individual-call' ? { ...toStandby(s), deviceLog: log(s, 'Individual call refused') } : s;
        case 'FINISH':
          if (radioProfile(s.model).cancelRequiresStandby) return { ...s, screen: 'cancel-done' };
          return { ...toStandby(s), distressActive: false, ackReceived: false, retxCount: 0 };
        case 'STBY': return { ...toStandby(s), distressActive: false, ackReceived: false, retxCount: 0, odSent: null, odAwaitingAck: false };
        default: return s;
      }
    }

    case 'soft-page': {
      if (s.screen !== 'standby') return s;
      const pages = standbySoftkeyPages(s);
      return { ...s, softPage: (s.softPage + e.dir + pages.length) % pages.length };
    }

    case 'scan-tick': {
      if (!s.scanActive) return s;
      const favorites = CHANNELS
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => s.favoriteChannels.includes(item.num));
      if (favorites.length < 2) return { ...s, scanActive: false, beeps: s.beeps + 1 };
      const current = favorites.findIndex(({ index }) => index === s.channelIndex);
      const next = favorites[(current + 1 + favorites.length) % favorites.length];
      return { ...s, channelIndex: next.index };
    }

    case 'distress-down': {
      if (s.distressActive || s.screen === 'distress-tx' || s.screen === 'cancel-tx') return s;
      const from = s.screen === 'distress-hold' ? s.back : s.screen;
      const back = ['volume', 'squelch', 'channel-select', 'backlight'].includes(from) ? 'standby' : from;
      return { ...s, screen: 'distress-hold', back };
    }
    case 'distress-up': return s.screen === 'distress-hold' ? { ...s, screen: s.back } : s;
    case 'distress-held':
      if (s.screen !== 'distress-hold') return s;
      return {
        ...s, screen: 'distress-tx', distressActive: true,
        deviceLog: log(s, `TX DSC DISTRESS on CH 70: MMSI ${s.vessel.mmsi}, nature ${NATURES[s.natureIndex]}, ${s.gpsValid ? `pos ${s.pos.lat} ${s.pos.lon}` : 'NO POSITION (no GPS!)'}`, 'tx'),
        beeps: s.beeps + 1,
      };
    case 'distress-txdone': return s.screen === 'distress-tx' ? { ...s, screen: 'distress-wait', retxPaused: false } : s;
    case 'cancel-txdone':
      return s.screen === 'cancel-tx' ? { ...s, screen: 'cancel-voice', channelIndex: CH16_INDEX, deviceLog: log(s, 'CH 16 selected. Voice cancel: press PTT and say: All stations...') } : s;
    case 'auto-retx':
      if (s.screen !== 'distress-wait' || s.retxPaused || s.ackReceived) return s;
      return { ...s, retxCount: s.retxCount + 1, deviceLog: log(s, 'Auto re-TX of Distress Alert (CH 70)', 'tx') };
    case 'coast-ack':
      if (!s.distressActive || s.ackReceived) return s;
      return { ...s, ackReceived: true, screen: 'distress-ack', deviceLog: log(s, `RX DSC DISTRESS ACK from ${COAST_STATION} (${COAST_MMSI}) - alarm sounds`, 'rx'), beeps: s.beeps + 1 };
    case 'otherdsc-ack':
      if (s.screen !== 'otherdsc-sent' || !s.odAwaitingAck) return s;
      return { ...s, screen: 'otherdsc-ack', odAwaitingAck: false, deviceLog: log(s, `RX DSC ACK from ${s.odSent?.address ?? 'station'}`, 'rx'), beeps: s.beeps + 1 };

    case 'aqua-down':
      if (s.screen !== 'standby') return s;
      return { ...s, aquaActive: true, deviceLog: log(s, 'AquaQuake ON - speaker water drain') };
    case 'aqua-up': return s.aquaActive ? { ...s, aquaActive: false, deviceLog: log(s, 'AquaQuake OFF') } : s;

    case 'ptt-down':
      if (channel(s).noVoice) return { ...s, deviceLog: log(s, 'CH 70 is DSC only - voice TX blocked'), beeps: s.beeps + 1 };
      return { ...s, ptt: true, deviceLog: log(s, `PTT TX on CH ${channel(s).num} (${effectivePower(s)})`, 'tx') };
    case 'ptt-up': return { ...s, ptt: false };
    default: return s;
  }
}
