'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Share_Tech_Mono } from 'next/font/google';
import { useI18n } from '@/lib/i18n';
import {
  DSC_ADDRESSES, DSC_VOICE_CHANNELS, NATURES, OTHERDSC_CATEGORIES, OTHERDSC_TYPES,
  channel, dscFieldValues, effectivePower, menuItems, otherDscRows, radioProfile, softkeys,
  type OtherDscField, type RadioEvent, type RadioModel, type RadioState,
} from './radioModel';

// ============================================================================
// Visual front panel of the ICOM IC-M330GE / IC-M323.
//
// Layout follows the manuals: speaker + red DISTRESS under a flip cover, LCD,
// softkeys, ENT/arrows/CLR/MENU cluster, round 16/C, PWR/VOL/SQL dial, and the
// fist-mic PTT.
//
// The look follows the 2026-07 `vhf-trainer` design handoff: green phosphor LCD
// (#79f0cf on #062a26) with scanlines and a Share Tech Mono face, a persistent
// status bar (band / GPS / watch / power / battery) above the screen and a
// TX + signal meter below it, a machined PWR-VOL-SQL knob, hazard-striped
// DISTRESS cover, and an amber (#ffce4d) pulse for the guided-course spotlight.
// The DEVICE stays the real exam hardware - only the styling is new.
// ============================================================================

// Self-hosted by next/font (no external request, so the CSP stays untouched).
const lcdFont = Share_Tech_Mono({ weight: '400', subsets: ['latin'], display: 'swap' });

// --- LCD phosphor palette (design tokens) -----------------------------------
const LCD_FG = '#79f0cf';
const LCD_DIM = '#4fae9c';
const LCD_FAINT = '#3f9184';
const LCD_WARN = '#e6c14a';
const LCD_ALERT = '#ff6b52';
const LCD_BG = 'linear-gradient(180deg,#062a26,#04201d)';
const LCD_SCAN = 'repeating-linear-gradient(0deg,rgba(0,0,0,.13) 0 1px,transparent 1px 3px)';
/** guided-course spotlight colour */
const HL = '#ffce4d';

/** Inspect-mode wiring handed down to the LCD indicators. */
interface Inspect {
  on: boolean;
  key: string | null;
  pick: (k: string) => void;
}

interface Props {
  s: RadioState;
  dispatch: (e: RadioEvent) => void;
  /** Which ICOM faceplate is active. It should match s.model. */
  model?: RadioModel;
  /** 0..1 progress of the 3 s DISTRESS hold. */
  holdPct: number;
  onDistressDown: () => void;
  onDistressUp: () => void;
  onPttDown: () => void;
  onPttUp: () => void;
  /** wall-clock string for the LCD, e.g. "14:30" */
  clock: string;
  /** seconds until next auto re-TX while waiting for ACK. */
  nextTxSec: number;
  /** Training course spotlight target, matched against data-testid. */
  highlightControl?: string;
  /** Inspect ("Rozbior") mode: taps explain a part instead of operating it. */
  inspect?: boolean;
  /** Called with the `data-ik` key of the tapped part while inspecting. */
  onInspect?: (key: string) => void;
  /** Currently explained part - gets a ring so the user sees what they picked. */
  inspectKey?: string | null;
  /** BUSY: the audio gate is open (receiving, or the squelch is set to OPEN). */
  busy?: boolean;
}

function Key({
  id, ik, children, onClick, onPointerDown, onPointerUp, onPointerLeave,
  onKeyDown, onKeyUp, wide, round, tone = 'grey', disabled, small, ariaLabel,
}: {
  id: string; ik?: string; children: ReactNode; onClick?: () => void;
  onPointerDown?: () => void; onPointerUp?: () => void; onPointerLeave?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  wide?: boolean; round?: boolean; tone?: 'grey' | 'blue' | 'red' | 'soft'; disabled?: boolean; small?: boolean;
  ariaLabel?: string;
}) {
  const bg =
    tone === 'red' ? 'linear-gradient(180deg,#4a5060,#343947)'
    : tone === 'blue' ? 'linear-gradient(180deg,#4a5060,#343947)'
    : tone === 'soft' ? 'linear-gradient(180deg,#3f4552,#2c313c)'
    : 'linear-gradient(180deg,#4a5060,#343947)';
  const fg = tone === 'red' ? '#ff5f52' : tone === 'blue' ? '#9fd8ff' : '#dfe5ee';
  return (
    <button
      type="button"
      data-testid={id}
      data-ik={ik}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      className={`select-none font-semibold transition active:translate-y-px active:brightness-95 disabled:opacity-35 ${
        round ? 'rounded-full' : 'rounded-lg'
      } ${wide ? 'col-span-2' : ''} ${small ? 'min-h-[44px] min-w-[44px] px-1 text-[10px]' : 'min-h-[44px] px-2 text-[11px]'}`}
      style={{
        background: bg,
        color: fg,
        border: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 5px rgba(0,0,0,0.45)',
        touchAction: 'none',
        letterSpacing: 0.4,
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- LCD ------

function LcdLine({ children, big, dim, color }: { children: ReactNode; big?: boolean; dim?: boolean; color?: string }) {
  return (
    <div style={{
      color: color ?? (dim ? LCD_DIM : LCD_FG),
      fontSize: big ? 15 : 11,
      lineHeight: 1.45,
      letterSpacing: 0.4,
    }}>
      {children}
    </div>
  );
}

function CenterGauge({ label, value, max = 10, zeroLabel }: { label: string; value: number; max?: number; zeroLabel?: string }) {
  return (
    <div style={{ paddingTop: 22 }}>
      <LcdLine big>{label}: {value === 0 && zeroLabel ? zeroLabel : value}</LcdLine>
      <div className="mt-2 h-2 w-full overflow-hidden rounded" style={{ background: 'rgba(121,240,207,0.16)' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: LCD_FG }} />
      </div>
      <LcdLine dim>rotate [DIAL] · push = next</LcdLine>
    </div>
  );
}

/** An LCD indicator: plain text normally, a tappable target while inspecting. */
function Ind({ ik, ins, style, children }: { ik: string; ins?: Inspect; style?: React.CSSProperties; children: ReactNode }) {
  if (!ins?.on) return <span style={style}>{children}</span>;
  const picked = ins.key === ik;
  return (
    <button
      type="button"
      data-ik={ik}
      onClick={() => ins.pick(ik)}
      style={{
        ...style,
        background: 'transparent',
        border: picked ? `1px solid ${HL}` : '1px dashed rgba(121,240,207,0.35)',
        borderRadius: 4,
        padding: '0 3px',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

/** Persistent top row of the LCD: band, GPS, watch mode, power, battery. */
function StatusBar({ s, ins, busy = false }: { s: RadioState; ins?: Inspect; busy?: boolean }) {
  const watch = s.scanActive ? 'SCAN' : s.dualWatch ? 'DW' : s.aquaActive ? 'AQUA' : '';
  return (
    <div
      className="flex items-center justify-between gap-1"
      style={{
        fontSize: 10.5,
        letterSpacing: 0.5,
        borderBottom: '1px solid rgba(121,240,207,0.16)',
        paddingBottom: 5,
        color: LCD_DIM,
      }}
    >
      <Ind ik="status-band" ins={ins}>INT</Ind>
      {/* "BUSY: displayed while receiving, OR THE SQUELCH IS OPEN" (M330GE p.3).
          It is the visual twin of the audio gate: if you can hear the speaker,
          BUSY is lit - always the same condition, never one without the other. */}
      <Ind ik="status-busy" ins={ins} style={{ color: busy ? LCD_WARN : LCD_FAINT, minWidth: 30 }}>
        {busy ? 'BUSY' : '·'}
      </Ind>
      <Ind ik="status-gps" ins={ins} style={{ color: s.gpsValid ? LCD_FG : LCD_FAINT }}>◈ GPS</Ind>
      <Ind ik="status-watch" ins={ins} style={{ color: LCD_WARN, minWidth: 32, textAlign: 'center' }}>{watch || '·'}</Ind>
      <Ind ik="status-power" ins={ins} style={{ color: LCD_FG, fontWeight: 700 }}>{effectivePower(s)}</Ind>
      <Ind ik="status-batt" ins={ins}>▮▮▮</Ind>
    </div>
  );
}

/** Persistent bottom row of the LCD: TX/RX state + signal meter. */
function TxMeter({ s, ins }: { s: RadioState; ins?: Inspect }) {
  const tx = s.ptt;
  const label = tx ? 'TX' : 'RX';
  const pct = tx ? '86%' : s.power ? '22%' : '0%';
  return (
    <div className="mt-2 flex items-center gap-2 border-t pt-1.5" style={{ borderColor: 'rgba(121,240,207,0.16)' }}>
      <Ind
        ik="tx-meter"
        ins={ins}
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: tx ? LCD_ALERT : LCD_DIM, minWidth: 24 }}
      >
        {label}
      </Ind>
      <div className="h-1.5 flex-1 overflow-hidden rounded" style={{ background: 'rgba(121,240,207,0.14)' }}>
        <div
          style={{
            height: '100%',
            width: pct,
            background: 'linear-gradient(90deg,#79f0cf 0%,#e6c14a 72%,#ff6b52 100%)',
            transition: 'width .12s',
          }}
        />
      </div>
    </div>
  );
}

function Lcd({ s, clock, holdPct, nextTxSec, ins, busy }: { s: RadioState; clock: string; holdPct: number; nextTxSec: number; ins?: Inspect; busy?: boolean }) {
  const ch16 = channel(s);
  const keys = softkeys(s);

  let body: ReactNode;
  if (!s.power) {
    body = (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#12463f', fontSize: 12, letterSpacing: 2 }}>
        {'- OFF -'}
      </div>
    );
  } else {
    switch (s.screen) {
      case 'volume':
        body = <CenterGauge label="Volume" value={s.volume} max={radioProfile(s.model).maxVolume} />;
        break;
      case 'squelch':
        // The bottom position is named, not numbered: "OPEN is completely open;
        // 10 is tight squelch; 1 is loose squelch" (IC-M323 p.14). The candidate
        // looks for the word OPEN on the exam radio, not for a zero.
        body = <CenterGauge label="SQL" value={s.squelch} zeroLabel="OPEN" />;
        break;
      case 'config':
        body = (
          <>
            <LcdLine big>{'▸'} CONFIGURATION</LcdLine>
            <LcdLine>Key Beep: {s.keyBeep ? 'On' : 'Off'}</LcdLine>
            <LcdLine dim>[ENT] toggles - Off = silent operation</LcdLine>
            <LcdLine dim>the DSC alarm always sounds</LcdLine>
          </>
        );
        break;
      case 'channel-select':
        body = (
          <>
            <LcdLine big>CHANNEL SELECT</LcdLine>
            <div style={{ fontSize: 46, textAlign: 'center', color: LCD_FG, textShadow: '0 0 10px rgba(121,240,207,.45)' }}>{ch16.num}</div>
            <LcdLine dim>Use [^]/[v]{s.model === 'M323' ? ' or rotate [DIAL]' : ''}</LcdLine>
          </>
        );
        break;
      case 'backlight':
        body = <CenterGauge label="Backlight" value={s.backlight} max={radioProfile(s.model).maxBacklight} />;
        break;
      case 'menu':
        body = (
          <>
            <LcdLine big>{'▸'} MENU</LcdLine>
            {menuItems(s).map((m, i) => (
              <LcdLine key={m} dim={i !== s.menuCursor}>{i === s.menuCursor ? '> ' : '  '}{m}</LcdLine>
            ))}
          </>
        );
        break;
      case 'm323-dsc-calls': {
        const calls = ['Individual Call', 'Group Call', 'All Ships Call', 'Distress Call', 'Test Call'];
        body = (
          <>
            <LcdLine big>{'▸'} DSC CALLS</LcdLine>
            {calls.map((call, i) => (
              <LcdLine key={call} dim={i !== s.m323CallCursor}>{i === s.m323CallCursor ? '> ' : '  '}{call}</LcdLine>
            ))}
          </>
        );
        break;
      }
      case 'gps-info':
        body = (
          <>
            <LcdLine big>GPS INFORMATION</LcdLine>
            <LcdLine>{s.gpsValid ? `${s.pos.lat}  ${s.pos.lon}` : 'NO POSITION'}</LcdLine>
            <LcdLine dim>{s.gpsValid ? `UTC ${clock}` : 'NO TIME'}</LcdLine>
            <LcdLine dim>GPS: {s.gpsValid ? '3D fix' : 'searching...'}</LcdLine>
          </>
        );
        break;
      case 'radio-info':
        body = (
          <>
            <LcdLine big>RADIO INFO</LcdLine>
            <LcdLine>MMSI: {s.vessel.mmsi}</LcdLine>
            <LcdLine dim>SW: 1.02 / GPS: 13.06</LcdLine>
          </>
        );
        break;
      case 'dsc-log':
        body = (
          <>
            <LcdLine big>DSC LOG</LcdLine>
            {s.deviceLog.filter((l) => l.kind !== 'ui').slice(-5).map((l, i) => (
              <LcdLine key={i} dim>{l.kind.toUpperCase()}: {l.text.slice(0, 30)}</LcdLine>
            ))}
            {s.deviceLog.filter((l) => l.kind !== 'ui').length === 0 && <LcdLine dim>-- no entries --</LcdLine>}
          </>
        );
        break;
      case 'stub-view':
        body = (
          <>
            <LcdLine big>{s.stubTitle.toUpperCase()}</LcdLine>
            <LcdLine dim>(podglad - nieuzywane w scenariuszach)</LcdLine>
            <LcdLine dim>[CLR] = back</LcdLine>
          </>
        );
        break;
      case 'distress-compose':
        body = (
          <>
            <LcdLine big color={LCD_ALERT}>{'⚠'} DISTRESS</LcdLine>
            <LcdLine dim>Push [DISTRESS] for 3 sec.</LcdLine>
            <LcdLine dim={s.composeCursor !== 0}>{s.composeCursor === 0 ? '> ' : '  '}Nature: {NATURES[s.natureIndex]} &gt;</LcdLine>
            <LcdLine dim={s.composeCursor !== 1}>{s.composeCursor === 1 ? '> ' : '  '}Position: {s.gpsValid ? 'GPS' : 'NO GPS - enter!'}</LcdLine>
          </>
        );
        break;
      case 'distress-nature':
        body = (
          <>
            <LcdLine big color={LCD_ALERT}>NATURE OF DISTRESS</LcdLine>
            {NATURES.slice(Math.max(0, s.natureCursor - 2), Math.max(0, s.natureCursor - 2) + 5).map((n) => {
              const idx = NATURES.indexOf(n);
              return <LcdLine key={n} dim={idx !== s.natureCursor}>{idx === s.natureCursor ? '> ' : '  '}{n}</LcdLine>;
            })}
          </>
        );
        break;
      case 'distress-hold':
        body = (
          <div style={{ textAlign: 'center' }}>
            <LcdLine big color={LCD_ALERT}>{'⚠'} DISTRESS</LcdLine>
            <LcdLine color={LCD_WARN}>Hold Down for 3 sec.</LcdLine>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded" style={{ background: 'rgba(255,107,82,.18)' }}>
              <div style={{ width: `${Math.round(holdPct * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#e6c14a,#ff6b52)', transition: 'width 60ms linear' }} />
            </div>
            <div style={{ fontSize: 20, marginTop: 3, color: LCD_ALERT }}>{(holdPct * 3).toFixed(1)}</div>
          </div>
        );
        break;
      case 'distress-tx':
        body = (
          <>
            <LcdLine big color={LCD_ALERT}>{'⚠'} DISTRESS</LcdLine>
            <LcdLine>Transmitting Distress Alert</LcdLine>
            <LcdLine dim>CH 70 · {NATURES[s.natureIndex]}</LcdLine>
          </>
        );
        break;
      case 'distress-wait':
        body = (
          <>
            <LcdLine big color={LCD_ALERT}>{'⚠'} DISTRESS</LcdLine>
            <LcdLine>Waiting for ACK</LcdLine>
            <LcdLine dim>{s.retxPaused ? 'Re-TX paused' : `Next TX after ${Math.floor(nextTxSec / 60)} min ${String(nextTxSec % 60).padStart(2, '0')} sec.`}</LcdLine>
            <LcdLine dim>{NATURES[s.natureIndex]} · MMSI {s.vessel.mmsi}</LcdLine>
          </>
        );
        break;
      case 'distress-ack':
        body = (
          <>
            <LcdLine big>RCVD DTRS ACK</LcdLine>
            <LcdLine>FROM: 002618102</LcdLine>
            <LcdLine>POLISH RESCUE RADIO</LcdLine>
            <LcdLine color={LCD_ALERT}>{'♪'} ALARM {'♪'}</LcdLine>
          </>
        );
        break;
      case 'distress-ack-done':
        body = (
          <>
            <LcdLine big>DISTRESS ACK RCVD</LcdLine>
            <LcdLine>CH 16 selected</LcdLine>
            <LcdLine dim>Hold [PTT], explain situation</LcdLine>
          </>
        );
        break;
      case 'cancel-confirm':
        body = (
          <>
            <LcdLine big color={LCD_ALERT}>DISTRESS CANCEL</LcdLine>
            <LcdLine>will transmit DSC cancel.</LcdLine>
          </>
        );
        break;
      case 'cancel-tx':
        body = (
          <>
            <LcdLine big color={LCD_ALERT}>DISTRESS CANCEL</LcdLine>
            <LcdLine>Transmitting Distress Cancel</LcdLine>
          </>
        );
        break;
      case 'cancel-voice':
        body = (
          <>
            <LcdLine big>VOICE CANCEL</LcdLine>
            <LcdLine dim>Press PTT &amp; say:</LcdLine>
            <LcdLine dim>&quot;All stations... CANCEL MY</LcdLine>
            <LcdLine dim>DISTRESS ALERT OF...&quot;</LcdLine>
          </>
        );
        break;
      case 'cancel-done':
        body = (
          <>
            <LcdLine big>CANCEL COMPLETE</LcdLine>
            <LcdLine dim>Push [STBY] to finish the</LcdLine>
            <LcdLine dim>Distress Cancel call.</LcdLine>
          </>
        );
        break;
      case 'otherdsc-compose': {
        const rows = otherDscRows(s);
        const rowValue = (field: OtherDscField) => {
          if (field === 'type') return OTHERDSC_TYPES[s.odType];
          if (field === 'address') return DSC_ADDRESSES[s.odAddress].label;
          if (field === 'category') return OTHERDSC_CATEGORIES[s.odCategory];
          return `CH ${DSC_VOICE_CHANNELS[s.odChannel]}`;
        };
        body = (
          <>
            <LcdLine big>{'▸'} OTHER DSC</LcdLine>
            {s.model === 'M330' && <LcdLine dim>Mode: Radio Telephone</LcdLine>}
            {rows.map((field, i) => (
              <LcdLine key={field} dim={s.odCursor !== i}>
                {s.odCursor === i ? '> ' : '  '}{field[0].toUpperCase() + field.slice(1)}: {rowValue(field)}
              </LcdLine>
            ))}
            <LcdLine dim={s.odCursor !== rows.length}>{s.odCursor === rows.length ? '> ' : '  '}[ Send on CH 70 ]</LcdLine>
          </>
        );
        break;
      }
      case 'otherdsc-field': {
        const list = dscFieldValues(s);
        body = (
          <>
            <LcdLine big>{(s.odField ?? 'field').toUpperCase()}</LcdLine>
            {list.map((n, i) => (
              <LcdLine key={n} dim={i !== s.odFieldCursor}>{i === s.odFieldCursor ? '> ' : '  '}{n}</LcdLine>
            ))}
          </>
        );
        break;
      }
      case 'otherdsc-sent':
        body = (
          <>
            <LcdLine big>DSC SENT</LcdLine>
            <LcdLine>{s.odSent?.type} / {s.odSent?.category}</LcdLine>
            <LcdLine dim>{s.odSent?.address}</LcdLine>
            <LcdLine>CH {s.odSent?.channel} {s.odAwaitingAck ? '- WAIT ACK' : 'selected'}</LcdLine>
            <LcdLine dim>{s.odAwaitingAck ? 'Do not transmit before ACK' : 'Hold [PTT] to transmit'}</LcdLine>
          </>
        );
        break;
      case 'otherdsc-ack':
        body = (
          <>
            <LcdLine big>RCVD DSC ACK</LcdLine>
            <LcdLine>{s.odSent?.address}</LcdLine>
            <LcdLine>VOICE CH {s.odSent?.channel}</LcdLine>
            <LcdLine color={LCD_ALERT}>{'♪'} ALARM {'♪'}</LcdLine>
          </>
        );
        break;
      case 'rx-distress-alert':
        body = (
          <>
            <LcdLine big color={LCD_ALERT}>RCVD DISTRESS</LcdLine>
            <LcdLine>FROM: {s.rxDistress?.name}</LcdLine>
            <LcdLine dim>MMSI {s.rxDistress?.mmsi}</LcdLine>
            <LcdLine dim>{s.rxDistress?.spoken}</LcdLine>
            <LcdLine dim>Nature: {s.rxDistress?.nature}</LcdLine>
            <LcdLine color={LCD_ALERT}>{'♪'} ALARM {'♪'}</LcdLine>
          </>
        );
        break;
      case 'rx-individual-call':
        body = (
          <>
            <LcdLine big>RCVD DSC CALL</LcdLine>
            <LcdLine>FROM: {s.rxCall?.label}</LcdLine>
            <LcdLine dim>MMSI {s.rxCall?.mmsi}</LcdLine>
            <LcdLine dim>Proposed CH {s.rxCall?.channel}</LcdLine>
            <LcdLine dim>[ACCEPT] switches channel</LcdLine>
          </>
        );
        break;
      default: {
        // standby
        body = (
          <div className="flex items-start justify-between" style={{ marginTop: 2 }}>
            <div>
              <div
                data-ik="ch-readout"
                onClick={ins?.on ? () => ins.pick('ch-readout') : undefined}
                style={{
                  cursor: ins?.on ? 'help' : undefined,
                  borderRadius: 6,
                  padding: ins?.on ? 2 : 0,
                  outline: ins?.on && ins.key === 'ch-readout' ? `2px solid ${HL}` : 'none',
                }}
              >
                <div style={{ fontSize: 9, letterSpacing: 1, color: LCD_DIM }}>CH</div>
                <div style={{ fontSize: 54, lineHeight: 0.82, color: LCD_FG, textShadow: '0 0 10px rgba(121,240,207,.45)' }}>
                  {ch16.num}
                </div>
              </div>
              <div style={{ fontSize: 9.5, letterSpacing: 0.5, color: LCD_DIM, marginTop: 6 }}>
                {s.gpsValid ? `${s.pos.lat} ${s.pos.lon}` : 'NO POS'}
              </div>
              <div style={{ fontSize: 9.5, letterSpacing: 0.5, color: LCD_FAINT }}>
                {s.gpsValid ? `${clock} UTC` : 'NO TIME'}
              </div>
            </div>
            <div style={{ textAlign: 'right', paddingTop: 6, maxWidth: 140 }}>
              <div style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: 1,
                color: '#04201d', background: ch16.num === '16' ? LCD_ALERT : LCD_FG,
                borderRadius: 4, padding: '2px 7px',
              }}>
                {ch16.num === '16' ? 'DISTRESS' : ch16.noVoice ? 'DSC' : ch16.lowOnly ? '1W ONLY' : 'SIMPLEX'}
              </div>
              <div style={{ fontSize: 9.5, color: LCD_DIM, marginTop: 6 }}>
                {s.favoriteChannels.includes(ch16.num) ? '★ ' : ''}{ch16.label ?? ''}
              </div>
            </div>
          </div>
        );
      }
    }
  }

  return (
    <div
      data-testid="lcd"
      data-ik="lcd"
      onClick={ins?.on ? (e) => {
        // Only claim the tap if it did not land on a more specific indicator.
        if ((e.target as HTMLElement).closest('[data-ik]') === e.currentTarget) ins.pick('lcd');
      } : undefined}
      className={`${lcdFont.className} relative rounded-lg px-3 py-2`}
      style={{
        background: LCD_BG,
        backgroundImage: `${LCD_SCAN}, ${LCD_BG}`,
        border: ins?.on && ins.key === 'lcd' ? `2px solid ${HL}` : '2px solid #0c0f13',
        borderRadius: 9,
        minHeight: 168,
        color: LCD_FG,
        boxShadow: 'inset 0 0 22px rgba(0,0,0,.7), inset 0 0 0 1px rgba(120,240,207,.06)',
        overflow: 'hidden',
        cursor: ins?.on ? 'pointer' : undefined,
      }}
    >
      {s.power && <StatusBar s={s} ins={ins} busy={busy} />}
      <div style={{ minHeight: 96, paddingTop: s.power ? 4 : 0 }}>{body}</div>
      {s.power && <TxMeter s={s} ins={ins} />}
      {/* softkey labels - bottom row, like on the device */}
      {s.power && (
        <div className="mt-1 grid grid-cols-4 gap-1 border-t pt-1" style={{ borderColor: 'rgba(121,240,207,0.25)' }}>
          {keys.map((k, i) => (
            <div key={i} style={{ fontSize: 8.5, textAlign: 'center', color: k ? LCD_FG : 'transparent', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {k || '.'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------- panel -------

/**
 * Which inspect entry a softkey carries right now. A softkey has no fixed
 * meaning - it does whatever its current label says - so inspect follows the
 * LABEL. Anything without a dedicated entry falls back to the general
 * "these four keys change meaning" explanation, which is the honest answer for
 * a context action like CANCEL or ALARM OFF.
 */
function softIk(label: string): string {
  switch (label) {
    case 'HI/LO': return 'sk-hilo';
    case 'DW': return 'sk-dw';
    case 'SCAN': return 'sk-scan';
    case 'DISTRESS': return 'sk-distress-menu';
    default: return 'softkeys';
  }
}

export default function RadioFront({
  s, dispatch, model = s.model, holdPct, onDistressDown, onDistressUp, onPttDown, onPttUp, clock, nextTxSec,
  highlightControl, inspect = false, onInspect, inspectKey = null, busy = false,
}: Props) {
  const { tp } = useI18n();
  const [coverOpen, setCoverOpen] = useState(false);
  const profile = radioProfile(model);

  // Inspect mode: a tap EXPLAINS the part instead of operating the radio, so no
  // event reaches the state machine. Off by default -> behaviour is unchanged.
  const ins: Inspect | undefined = inspect
    ? { on: true, key: inspectKey, pick: (k: string) => onInspect?.(k) }
    : undefined;
  /** wrap a control action so inspect mode intercepts it */
  const act = (ikKey: string, run: () => void) => () => {
    if (inspect) { onInspect?.(ikKey); return; }
    run();
  };
  /** pointer handlers are dropped entirely while inspecting (no holds fire) */
  const hold = <T,>(handler: T): T | undefined => (inspect ? undefined : handler);
  const dialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialFiredHold = useRef(false);
  const callTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callFiredHold = useRef(false);

  // Both manuals specify a one second hold for power and Call Channel.
  const dialDown = useCallback(() => {
    dialFiredHold.current = false;
    dialTimer.current = setTimeout(() => {
      dialFiredHold.current = true;
      dispatch({ type: 'dial-hold' });
    }, 1000);
  }, [dispatch]);
  const dialUp = useCallback(() => {
    if (dialTimer.current) clearTimeout(dialTimer.current);
    if (!dialFiredHold.current) dispatch({ type: 'dial-push' });
  }, [dispatch]);
  const dialCancel = useCallback(() => {
    if (dialTimer.current) clearTimeout(dialTimer.current);
    dialFiredHold.current = true; // a cancelled gesture must not fire dial-push later
  }, []);
  const callDown = useCallback(() => {
    callFiredHold.current = false;
    callTimer.current = setTimeout(() => {
      callFiredHold.current = true;
      dispatch({ type: 'key-16c-hold' });
    }, 1000);
  }, [dispatch]);
  const callUp = useCallback(() => {
    if (callTimer.current) clearTimeout(callTimer.current);
    if (!callFiredHold.current) dispatch({ type: 'key-16c' });
  }, [dispatch]);
  const callCancel = useCallback(() => {
    if (callTimer.current) clearTimeout(callTimer.current);
    callFiredHold.current = true;
  }, []);
  const isActivationKey = (key: string) => key === ' ' || key === 'Enter';
  useEffect(() => () => {
    if (dialTimer.current) clearTimeout(dialTimer.current);
    if (callTimer.current) clearTimeout(callTimer.current);
  }, []);

  return (
    // device stage: the radio sits on a lit deck, as in the design handoff
    <div
      data-radio-highlight={highlightControl}
      className="radio-stage rounded-2xl"
      style={{
        background: 'radial-gradient(120% 100% at 50% 0%,#26527e 0%,#183a5c 45%,#0e263f 100%)',
        padding: 'clamp(12px,2.2vw,22px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 18px 40px -20px rgba(6,26,50,.8)',
      }}
    >
      {highlightControl && (
        <style>{`
          [data-radio-highlight="${highlightControl}"] [data-testid="${highlightControl}"] {
            animation: radio-hl 1.25s ease-in-out infinite;
            border-radius: 9px;
            position: relative;
            z-index: 3;
          }
          @keyframes radio-hl {
            0%, 100% { box-shadow: 0 0 0 3px ${HL}, 0 0 12px 2px rgba(255,196,54,.55); }
            50%      { box-shadow: 0 0 0 4px ${HL}, 0 0 22px 5px rgba(255,196,54,.9); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-radio-highlight="${highlightControl}"] [data-testid="${highlightControl}"] {
              animation: none;
              box-shadow: 0 0 0 3px ${HL};
            }
          }
        `}</style>
      )}

      {/* radio body */}
      <div
        className="radio-front mx-auto"
        style={{
          maxWidth: 440,
          background: 'linear-gradient(168deg,#3b414c 0%,#2b303a 55%,#22262e 100%)',
          borderRadius: 16,
          padding: '16px 15px 18px',
          border: '1px solid #171a20',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14), inset 0 -2px 6px rgba(0,0,0,.4), 0 10px 24px -12px rgba(0,0,0,.6)',
        }}
      >
        {/* brand row */}
        <div className="mb-3 flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 15, height: 15, borderRadius: 4,
                background: 'conic-gradient(from 210deg,#0a58c2,#39b0e5,#0a58c2)',
                boxShadow: '0 0 6px rgba(57,176,229,.5)',
              }}
            />
            <span>
              <span className="block whitespace-nowrap text-[12px] font-bold leading-none tracking-wide text-[#eef3fa]">{profile.nameplate}</span>
              <span className="block text-[7.5px] font-medium leading-tight tracking-[1.5px] text-[#8b97a8]">DSC CLASS D</span>
            </span>
          </div>
          <span className="text-right text-[7.5px] font-medium leading-tight tracking-[1.4px] text-[#7d8899]">
            VHF MARINE<br />TRANSCEIVER
          </span>
        </div>

        {/* LCD */}
        <Lcd s={s} clock={clock} holdPct={holdPct} nextTxSec={nextTxSec} ins={ins} busy={busy} />

        {/* softkeys - a softkey explains the function it currently carries, and
            falls back to the general "these keys change meaning" entry. */}
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {softkeys(s).map((k, i) => {
            const aqua = k === 'AQUA' && !inspect;
            const ikKey = softIk(k);
            return (
              <Key
                key={i}
                id={`soft-${i}`}
                ik={ikKey}
                small
                tone="soft"
                disabled={inspect ? false : (!s.power || !k)}
                onClick={aqua ? undefined : act(ikKey, () => dispatch({ type: 'soft', index: i }))}
                onPointerDown={aqua ? () => dispatch({ type: 'aqua-down' }) : undefined}
                onPointerUp={aqua ? () => dispatch({ type: 'aqua-up' }) : undefined}
                onPointerLeave={aqua ? () => dispatch({ type: 'aqua-up' }) : undefined}
                onKeyDown={aqua ? (e) => {
                  if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); dispatch({ type: 'aqua-down' }); }
                } : undefined}
                onKeyUp={aqua ? (e) => {
                  if (isActivationKey(e.key)) { e.preventDefault(); dispatch({ type: 'aqua-up' }); }
                } : undefined}
              >
                {k || '·'}
              </Key>
            );
          })}
        </div>

        {/* controls: knob + keypad */}
        <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: '1fr 1.15fr' }}>
          {/* knob */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              data-testid="dial-center"
              data-ik="dial"
              aria-label="Dial: press for volume/squelch, hold for power"
              onClick={inspect ? () => onInspect?.('dial') : undefined}
              onPointerDown={hold(dialDown)}
              onPointerUp={hold(dialUp)}
              onPointerLeave={hold(dialCancel)}
              onPointerCancel={hold(dialCancel)}
              onKeyDown={hold((e: React.KeyboardEvent<HTMLButtonElement>) => {
                if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); dialDown(); }
              })}
              onKeyUp={hold((e: React.KeyboardEvent<HTMLButtonElement>) => {
                if (isActivationKey(e.key)) { e.preventDefault(); dialUp(); }
              })}
              className="relative select-none"
              style={{
                width: 76, height: 76, borderRadius: '50%',
                border: inspect && inspectKey === 'dial' ? `2px solid ${HL}` : 'none',
                background: 'radial-gradient(circle at 38% 32%,#565d69,#2b2f38 70%,#1c1f26)',
                boxShadow: 'inset 0 2px 3px rgba(255,255,255,.18), inset 0 -3px 6px rgba(0,0,0,.6), 0 3px 8px rgba(0,0,0,.5)',
                touchAction: 'none',
              }}
            >
              {/* pointer indicator */}
              <span style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 4, height: 16, borderRadius: 2, background: '#cfd6e0' }} />
              <span style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%,#3a3f49,#23272f)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,.12)' }} />
            </button>
            <div className="text-center text-[8px] font-semibold leading-tight tracking-wider text-[#9aa5b4]">
              PWR·VOL·SQL
              <br />
              <span className="text-[#6b7686]">
                {tp('жми = VOL/SQL', 'press = VOL/SQL', 'krotko = VOL/SQL')}
                {' · '}
                {tp('держи = PWR', 'hold = PWR', 'przytrzymaj = PWR')}
              </span>
            </div>
            {/* rotate rockers */}
            <div className="flex gap-1.5">
              <Key id="dial-ccw" ik="dial" small ariaLabel="Rotate dial counter-clockwise" onClick={act('dial', () => dispatch({ type: 'dial-rotate', dir: -1 }))}>↺</Key>
              <Key id="dial-cw" ik="dial" small ariaLabel="Rotate dial clockwise" onClick={act('dial', () => dispatch({ type: 'dial-rotate', dir: 1 }))}>↻</Key>
            </div>
          </div>

          {/* keypad */}
          <div className="flex flex-col gap-1.5">
            <Key
              id="key-16c"
              ik="key-16c"
              tone="red"
              ariaLabel="Channel 16, hold for Call Channel"
              onClick={inspect ? () => onInspect?.('key-16c') : undefined}
              onPointerDown={hold(callDown)}
              onPointerUp={hold(callUp)}
              onPointerLeave={hold(callCancel)}
              onKeyDown={hold((e: React.KeyboardEvent<HTMLButtonElement>) => {
                if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); callDown(); }
              })}
              onKeyUp={hold((e: React.KeyboardEvent<HTMLButtonElement>) => {
                if (isActivationKey(e.key)) { e.preventDefault(); callUp(); }
              })}
            >
              16 · C
            </Key>
            {/* Each key carries its OWN inspect id - tapping MENU in inspect mode
                must explain MENU, not "the keypad". */}
            <div className="grid grid-cols-3 gap-1.5">
              <Key id="key-left" ik="key-left" small ariaLabel="Softkey page left" onClick={act('key-left', () => dispatch({ type: 'soft-page', dir: -1 }))}>◀</Key>
              <Key id="key-up" ik="key-up" small ariaLabel="Up / channel up" onClick={act('key-up', () => dispatch({ type: 'up' }))}>▲</Key>
              <Key id="key-right" ik="key-right" small ariaLabel="Softkey page right" onClick={act('key-right', () => dispatch({ type: 'soft-page', dir: 1 }))}>▶</Key>
              <Key id="key-clr" ik="key-clr" small ariaLabel="Clear / back" onClick={act('key-clr', () => dispatch({ type: 'clr' }))}>{profile.clearLabel}</Key>
              <Key id="key-down" ik="key-down" small ariaLabel="Down / channel down" onClick={act('key-down', () => dispatch({ type: 'down' }))}>▼</Key>
              <Key id="key-menu" ik="key-menu" small ariaLabel="Menu" onClick={act('key-menu', () => dispatch({ type: 'menu' }))}>MENU</Key>
            </div>
            <Key id="key-ent" ik="key-ent" small ariaLabel="Enter" onClick={act('key-ent', () => dispatch({ type: 'ent' }))}>ENT</Key>
          </div>
        </div>

        {/* DISTRESS under a hazard-striped cover */}
        <div className="mt-3 border-t pt-3" style={{ borderColor: '#1b1e25' }}>
          {!coverOpen ? (
            <button
              type="button"
              data-testid="distress-cover"
              data-ik="distress-cover"
              aria-label="Open DISTRESS cover"
              onClick={act('distress-cover', () => setCoverOpen(true))}
              className="relative w-full select-none"
              style={{
                height: 46, borderRadius: 9,
                border: inspect && inspectKey === 'distress-cover' ? `2px solid ${HL}` : '2px solid #b23524',
                background: 'repeating-linear-gradient(45deg,#c93a26 0 11px,#a82e1e 11px 22px)',
                color: '#ffe8e2', fontWeight: 700, fontSize: 12, letterSpacing: 2,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2), 0 3px 7px rgba(0,0,0,.4)',
              }}
            >
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>⬒</span>
              DISTRESS · {tp('открой крышку', 'open the cover', 'otworz oslone')}
            </button>
          ) : (
            <div style={{ borderRadius: 9, padding: 5, background: 'rgba(200,58,38,.12)', border: '1px dashed rgba(210,90,70,.5)' }}>
              <button
                type="button"
                data-testid="distress-key"
                data-ik="distress-key"
                onClick={inspect ? () => onInspect?.('distress-key') : undefined}
                onPointerDown={hold(onDistressDown)}
                onPointerUp={hold(onDistressUp)}
                onPointerLeave={hold(onDistressUp)}
                onPointerCancel={hold(onDistressUp)}
                onKeyDown={hold((e: React.KeyboardEvent<HTMLButtonElement>) => {
                  if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); onDistressDown(); }
                })}
                onKeyUp={hold((e: React.KeyboardEvent<HTMLButtonElement>) => {
                  if (isActivationKey(e.key)) { e.preventDefault(); onDistressUp(); }
                })}
                className="w-full select-none"
                style={{
                  height: 44, borderRadius: 7, border: 'none',
                  background: 'radial-gradient(circle at 50% 35%,#ff5a44,#c8271a)',
                  color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 2,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), 0 3px 8px rgba(180,30,20,.55)',
                  touchAction: 'none',
                }}
              >
                DISTRESS - {tp('держи 3 сек', 'hold 3 sec', 'trzymaj 3 sek')}
              </button>
              <button
                type="button"
                onClick={() => setCoverOpen(false)}
                className="mt-1.5 w-full"
                style={{ height: 22, border: 'none', background: 'transparent', color: '#c48a82', fontSize: 10 }}
              >
                {tp('закрыть крышку', 'close the cover', 'zamknij oslone')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* fist mic PTT. The housing itself is inspectable ("mic"); the PTT lever
          inside it has its own entry. */}
      <div
        className="mx-auto mt-3 flex items-center gap-3"
        data-ik="mic"
        // The PTT lever sits INSIDE the housing, so its click bubbles up here.
        // Resolve to the innermost part that names itself: a tap on the lever
        // must explain the lever, not the handset it is bolted to.
        onClick={inspect ? (e) => {
          const hit = (e.target as HTMLElement).closest('[data-ik]');
          onInspect?.(hit?.getAttribute('data-ik') ?? 'mic');
        } : undefined}
        style={{
          maxWidth: 440,
          background: 'linear-gradient(165deg,#33383f,#1f2229)',
          border: inspect && inspectKey === 'mic' ? `2px solid ${HL}` : '1px solid #14171d',
          borderRadius: 12,
          padding: '11px 13px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1)',
          cursor: inspect ? 'help' : undefined,
        }}
      >
        <button
          type="button"
          data-testid="ptt"
          data-ik="ptt"
          onClick={inspect ? () => onInspect?.('ptt') : undefined}
          onPointerDown={hold(onPttDown)}
          onPointerUp={hold(onPttUp)}
          onPointerLeave={hold(onPttUp)}
          onPointerCancel={hold(onPttUp)}
          onKeyDown={hold((e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); onPttDown(); }
          })}
          onKeyUp={hold((e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (isActivationKey(e.key)) { e.preventDefault(); onPttUp(); }
          })}
          className="flex-1 select-none"
          style={{
            height: 54, borderRadius: 9,
            border: inspect && inspectKey === 'ptt' ? `2px solid ${HL}` : 'none',
            background: s.ptt ? 'radial-gradient(circle at 50% 35%,#ff5a44,#c8271a)' : 'linear-gradient(180deg,#4a5060,#343947)',
            color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 1.5,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), 0 3px 8px rgba(0,0,0,.5)',
            touchAction: 'none',
            transition: 'background .1s',
          }}
        >
          PTT · {tp('держи = говори', 'hold = talk', 'trzymaj = mowisz')}
        </button>
        <div style={{ flex: '0 0 96px' }}>
          <div style={{ height: 8, background: '#12151b', borderRadius: 4, overflow: 'hidden', border: '1px solid #0a0c10' }}>
            <div
              style={{
                height: '100%',
                width: s.ptt ? '88%' : '0%',
                background: 'linear-gradient(90deg,#3ec98a,#e6c14a,#ff6b52)',
                transition: 'width .12s',
              }}
            />
          </div>
          <div className="mt-1 text-center text-[7.5px] font-medium tracking-widest text-[#7d8899]">
            {tp('ПЕРЕДАЧА', 'TRANSMIT', 'NADAWANIE')}
          </div>
        </div>
      </div>
    </div>
  );
}
