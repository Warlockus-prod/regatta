import { describe, expect, it } from 'vitest';
import {
  CHANNELS, DSC_VOICE_CHANNELS, RADIO_PROFILES, createInitialRadio, otherDscRows, radioReducer,
  type RadioState,
} from './radioModel';

function powered(model: 'M330' | 'M323' = 'M330') {
  return radioReducer(createInitialRadio(model), { type: 'dial-hold' });
}

describe('radio model hardware profiles', () => {
  it('uses DIAL rotation for volume on IC-M330 standby', () => {
    const before = powered('M330');
    const after = radioReducer(before, { type: 'dial-rotate', dir: -1 });
    expect(after.screen).toBe('volume');
    expect(after.volume).toBe(before.volume - 1);
    expect(after.channelIndex).toBe(before.channelIndex);
  });

  it('uses arrow keys for channel selection on IC-M330', () => {
    const before = powered('M330');
    const after = radioReducer(before, { type: 'up' });
    expect(after.channelIndex).not.toBe(before.channelIndex);
  });

  it('cycles VOL, SQL, CH and backlight on IC-M323', () => {
    let state = powered('M323');
    state = radioReducer(state, { type: 'dial-push' });
    expect(state.screen).toBe('volume');
    state = radioReducer(state, { type: 'dial-push' });
    expect(state.screen).toBe('squelch');
    state = radioReducer(state, { type: 'dial-push' });
    expect(state.screen).toBe('channel-select');
    state = radioReducer(state, { type: 'dial-push' });
    expect(state.screen).toBe('backlight');
    state = radioReducer(state, { type: 'dial-push' });
    expect(state.screen).toBe('standby');
  });

  it('selects the programmed Call Channel on a long 16/C press', () => {
    const before = powered('M330');
    const after = radioReducer(before, { type: 'key-16c-hold' });
    expect(CHANNELS[after.channelIndex].num).toBe('06');
  });

  it('finishes distress cancel differently on each model', () => {
    const m330 = { ...powered('M330'), screen: 'cancel-voice' as const, distressActive: true };
    const m323 = { ...powered('M323'), screen: 'cancel-voice' as const, distressActive: true };
    expect(radioReducer(m330, { type: 'soft', index: 0 }).screen).toBe('cancel-done');
    const m323Done = radioReducer(m323, { type: 'soft', index: 0 });
    expect(m323Done.screen).toBe('standby');
    expect(m323Done.distressActive).toBe(false);
  });

  it('uses one deterministic midpoint for the real random 3.5-4.5 minute repeat interval', () => {
    expect(RADIO_PROFILES.M330.retxSeconds).toBe(240);
    expect(RADIO_PROFILES.M323.retxSeconds).toBe(240);
  });
});

describe('DSC and radio safeguards', () => {
  it('blocks voice transmission on channel 70', () => {
    const state = {
      ...powered(),
      channelIndex: CHANNELS.findIndex((channel) => channel.num === '70'),
    };
    const next = radioReducer(state, { type: 'ptt-down' });
    expect(next.ptt).toBe(false);
    expect(next.deviceLog.at(-1)?.text).toContain('DSC only');
  });

  it('sends an individual DSC call with address and working channel', () => {
    let state: RadioState = { ...powered(), screen: 'otherdsc-compose', odType: 0 };
    state = { ...state, odCursor: otherDscRows(state).length };
    state = radioReducer(state, { type: 'ent' });
    expect(state.screen).toBe('otherdsc-sent');
    expect(state.odAwaitingAck).toBe(true);
    expect(state.odSent?.address).toContain('002618102');
    expect(state.odSent?.channel).toBe(DSC_VOICE_CHANNELS[state.odChannel]);
  });

  it('implements scan, Dual Watch, backlight and favorites', () => {
    let state = { ...powered(), softPage: 1 };
    state = radioReducer(state, { type: 'soft', index: 0 });
    expect(state.scanActive).toBe(true);
    state = radioReducer(state, { type: 'soft', index: 1 });
    expect(state.scanActive).toBe(false);
    expect(state.dualWatch).toBe(true);
    state = radioReducer(state, { type: 'soft', index: 3 });
    expect(state.screen).toBe('backlight');
  });

  it('keeps the DSC repeat active when 16/C selects the voice channel before ACK', () => {
    const waiting = { ...powered(), screen: 'distress-wait' as const, distressActive: true };
    const next = radioReducer(waiting, { type: 'key-16c' });
    expect(next.screen).toBe('distress-wait');
    expect(next.distressActive).toBe(true);
    expect(CHANNELS[next.channelIndex].num).toBe('16');
  });

  it('blocks manual position input while valid GPS data is present', () => {
    const state = { ...powered(), screen: 'position-input' as const, gpsValid: true };
    const next = radioReducer(state, { type: 'soft', index: 0 });
    expect(next).toEqual(state);
  });

  it('keeps the external GPS availability state when the radio is powered on', () => {
    const disconnected = { ...createInitialRadio(), gpsValid: false };
    expect(radioReducer(disconnected, { type: 'dial-hold' }).gpsValid).toBe(false);
  });

  it('saves manual position in three confirmed fields when GPS is unavailable', () => {
    let state: RadioState = { ...powered(), screen: 'position-input', gpsValid: false, positionInputStage: 0 };
    state = radioReducer(state, { type: 'soft', index: 0 });
    expect(state.positionInputStage).toBe(1);
    state = radioReducer(state, { type: 'soft', index: 0 });
    expect(state.positionInputStage).toBe(2);
    state = radioReducer(state, { type: 'soft', index: 0 });
    expect(state.screen).toBe('dsc-settings');
    expect(state.deviceLog.at(-1)?.text).toContain('Manual position saved');
  });

  it('adds and deletes the UKE Lyngby address through the radio screens', () => {
    let state: RadioState = {
      ...powered(),
      screen: 'individual-id-add-mmsi',
      idEntryMmsi: '002191000',
      idEntryCursor: 8,
      individualIds: powered().individualIds.filter((item) => item.mmsi !== '002191000'),
    };
    state = radioReducer(state, { type: 'ent' });
    expect(state.screen).toBe('individual-id-add-name');
    state = radioReducer(state, { type: 'soft', index: 0 });
    expect(state.individualIds.some((item) => item.label === 'LYNGBY' && item.mmsi === '002191000')).toBe(true);

    state = { ...state, screen: 'individual-id-list', idCursor: state.individualIds.findIndex((item) => item.mmsi === '002191000') };
    state = radioReducer(state, { type: 'soft', index: 2 });
    expect(state.screen).toBe('individual-id-delete');
    state = radioReducer(state, { type: 'soft', index: 0 });
    expect(state.individualIds.some((item) => item.mmsi === '002191000')).toBe(false);
  });
});
