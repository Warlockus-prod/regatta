'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Share_Tech_Mono } from 'next/font/google';
import { useI18n } from '@/lib/i18n';
import {
  DSC_VOICE_CHANNELS, NATURES, OTHERDSC_CATEGORIES, OTHERDSC_TYPES,
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
// with scanlines and a Share Tech Mono face, a persistent status bar (band /
// GPS / watch / power / battery) above the screen and a TX + signal meter below
// it, a machined PWR-VOL-SQL knob, hazard-striped DISTRESS cover, and an amber
// (#ffce4d) pulse for the guided-course spotlight.
// The DEVICE stays the real exam hardware - only the styling is new.
//
// LCD SKIN (2026-07): the screen colour is a `skin` - the trainer default is
// the green phosphor from the handoff; "amber" repaints the screen to match the
// real IC-M330GE / IC-M323, whose display is an amber dot-matrix, so a candidate
// can practise on the colour they will actually see on exam day. Only the SCREEN
// changes: the grey device body is identical on both, exactly as on the hardware.
// ============================================================================

// Self-hosted by next/font (no external request, so the CSP stays untouched).
const lcdFont = Share_Tech_Mono({ weight: '400', subsets: ['latin'], display: 'swap' });

// --- LCD palette (design tokens) --------------------------------------------
// The colours are CSS variables set on the faceplate per skin (see LCD_SKINS),
// so every indicator below inherits the active skin with no prop threading.
const LCD_FG = 'var(--lcd-fg)';
const LCD_DIM = 'var(--lcd-dim)';
const LCD_FAINT = 'var(--lcd-faint)';
const LCD_WARN = 'var(--lcd-warn)';
const LCD_ALERT = 'var(--lcd-alert)';
const LCD_BG = 'var(--lcd-bg)';
const LCD_SCAN = 'var(--lcd-scan)';
/** guided-course spotlight colour */
const HL = '#ffce4d';

/** Which LCD colour the screen is painted in. */
export type RadioSkin = 'green' | 'amber';

// The two skins. `--lcd-tint` is the phosphor RGB triple that the low-alpha
// tracks, borders and glows are mixed from (`rgba(var(--lcd-tint),a)`). Real
// amber units are monochrome; we keep the hot red-orange `--lcd-alert` on both
// because the DISTRESS / TX states rely on colour to read as danger.
const LCD_SKINS: Record<RadioSkin, React.CSSProperties> = {
  green: {
    '--lcd-fg': '#79f0cf',
    '--lcd-dim': '#4fae9c',
    '--lcd-faint': '#3f9184',
    '--lcd-warn': '#e6c14a',
    '--lcd-alert': '#ff6b52',
    '--lcd-bg': 'linear-gradient(180deg,#062a26,#04201d)',
    '--lcd-scan': 'repeating-linear-gradient(0deg,rgba(0,0,0,.13) 0 1px,transparent 1px 3px)',
    '--lcd-tint': '121,240,207',
  } as React.CSSProperties,
  amber: {
    '--lcd-fg': '#ffb638',
    '--lcd-dim': '#c98a2e',
    // Lifted from #8a6023 (~3.3:1) to reach >=4.5:1 on the amber LCD for the
    // 9.5-10.5px faint text (NO TIME, GPS-off, status bar). Still visibly
    // fainter than --lcd-dim, so the phosphor hierarchy is preserved.
    '--lcd-faint': '#b5842f',
    '--lcd-warn': '#ffd873',
    '--lcd-alert': '#ff6b52',
    '--lcd-bg': 'linear-gradient(180deg,#241603,#180f01)',
    '--lcd-scan': 'repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px)',
    '--lcd-tint': '255,182,56',
  } as React.CSSProperties,
};

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
  /** LCD colour skin. Defaults to the green-phosphor trainer look. */
  skin?: RadioSkin;
  /** Realistic hardware faceplate (graphite body + speaker grille), matching the
   *  real IC-M330GE product photo. Pairs with skin="amber". */
  realistic?: boolean;
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
    // solid blue, like the round 16/C key on the real IC-M330
    : tone === 'blue' ? 'radial-gradient(circle at 42% 30%,#3aa3ea,#1f74c4 62%,#175da0)'
    : tone === 'soft' ? 'linear-gradient(180deg,#3f4552,#2c313c)'
    : 'linear-gradient(180deg,#4a5060,#343947)';
  const fg = tone === 'red' ? '#ff5f52' : tone === 'blue' ? '#ffffff' : '#dfe5ee';
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

/**
 * Backlight 0..7 -> a CSS brightness multiplier.
 *
 * OFF is not black: a real LCD stays legible in daylight with the backlight off,
 * and at night your dark-adapted eye reads it fine. What the level 7 screen does
 * is destroy that adaptation - which is the whole point of the lesson, and it can
 * only be felt if the screen actually changes.
 */
function backlightBrightness(level: number): number {
  return 0.42 + (Math.max(0, Math.min(7, level)) / 7) * 0.78;   // 0.42 .. 1.20
}

function CenterGauge({ label, value, max = 10, zeroLabel }: { label: string; value: number; max?: number; zeroLabel?: string }) {
  return (
    <div style={{ paddingTop: 22 }}>
      <LcdLine big>{label}: {value === 0 && zeroLabel ? zeroLabel : value}</LcdLine>
      <div className="mt-2 h-2 w-full overflow-hidden rounded" style={{ background: 'rgba(var(--lcd-tint),0.16)' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: LCD_FG }} />
      </div>
      <LcdLine dim>rotate [DIAL] · push = next</LcdLine>
    </div>
  );
}

/** An LCD indicator: plain text normally, a tappable target while inspecting. */
function Ind({ ik, ins, style, label, children }: { ik: string; ins?: Inspect; style?: React.CSSProperties; label?: string; children: ReactNode }) {
  if (!ins?.on) return <span style={style}>{children}</span>;
  const picked = ins.key === ik;
  return (
    <button
      type="button"
      data-ik={ik}
      // The visible content is a raw glyph ('▮▮▮', '◈ GPS', '·'); the aria-label
      // gives screen-reader users a real name for the indicator they can inspect.
      aria-label={label ?? ik}
      onClick={() => ins.pick(ik)}
      style={{
        ...style,
        background: 'transparent',
        border: picked ? `1px solid ${HL}` : '1px dashed rgba(var(--lcd-tint),0.35)',
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
        borderBottom: '1px solid rgba(var(--lcd-tint),0.16)',
        paddingBottom: 5,
        color: LCD_DIM,
      }}
    >
      <Ind ik="status-band" ins={ins} label="frequency band">INT</Ind>
      {/* "BUSY: displayed while receiving, OR THE SQUELCH IS OPEN" (M330GE p.3).
          It is the visual twin of the audio gate: if you can hear the speaker,
          BUSY is lit - always the same condition, never one without the other. */}
      <Ind ik="status-busy" ins={ins} label="busy indicator" style={{ color: busy ? LCD_WARN : LCD_FAINT, minWidth: 30 }}>
        {busy ? 'BUSY' : '·'}
      </Ind>
      <Ind ik="status-gps" ins={ins} label="GPS status" style={{ color: s.gpsValid ? LCD_FG : LCD_FAINT }}>◈ GPS</Ind>
      <Ind ik="status-watch" ins={ins} label="watch mode" style={{ color: LCD_WARN, minWidth: 32, textAlign: 'center' }}>{watch || '·'}</Ind>
      <Ind ik="status-power" ins={ins} label="transmit power" style={{ color: LCD_FG, fontWeight: 700 }}>{effectivePower(s)}</Ind>
      <Ind ik="status-batt" ins={ins} label="battery indicator">▮▮▮</Ind>
    </div>
  );
}

/** Persistent bottom row of the LCD: TX/RX state + signal meter. */
function TxMeter({ s, ins }: { s: RadioState; ins?: Inspect }) {
  const tx = s.ptt;
  const label = tx ? 'TX' : 'RX';
  const pct = tx ? '86%' : s.power ? '22%' : '0%';
  return (
    <div className="mt-2 flex items-center gap-2 border-t pt-1.5" style={{ borderColor: 'rgba(var(--lcd-tint),0.16)' }}>
      <Ind
        ik="tx-meter"
        ins={ins}
        label="transmit / receive meter"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: tx ? LCD_ALERT : LCD_DIM, minWidth: 24 }}
      >
        {label}
      </Ind>
      <div className="h-1.5 flex-1 overflow-hidden rounded" style={{ background: 'rgba(var(--lcd-tint),0.14)' }}>
        <div
          style={{
            height: '100%',
            width: pct,
            background: 'linear-gradient(90deg,var(--lcd-fg) 0%,#e6c14a 72%,#ff6b52 100%)',
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
    // Skin-aware "off" text: the old hard-coded #12463f was a green-skin colour
    // (~1.7:1, invisible, and off-palette on the amber skin). A phosphor-tint
    // wash at 0.5 alpha reads on BOTH skins at >=3:1 without lighting the LCD.
    body = (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(var(--lcd-tint),0.5)', fontSize: 12, letterSpacing: 2 }}>
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
      case 'dsc-settings': {
        const items = ['Position Input', 'Individual ID'];
        body = (
          <>
            <LcdLine big>{'▸'} DSC SETTINGS</LcdLine>
            {items.map((item, index) => (
              <LcdLine key={item} dim={index !== s.dscSettingsCursor}>
                {index === s.dscSettingsCursor ? '> ' : '  '}{item}
              </LcdLine>
            ))}
          </>
        );
        break;
      }
      case 'position-input': {
        const stages = [
          `Latitude:  ${s.pos.lat}`,
          `Longitude: ${s.pos.lon}`,
          `UTC time:  ${s.positionTime}`,
        ];
        body = (
          <>
            <LcdLine big>POSITION INPUT</LcdLine>
            {s.gpsValid ? (
              <>
                <LcdLine color={LCD_WARN}>VALID GPS DATA ACTIVE</LcdLine>
                <LcdLine dim>Manual input is unavailable</LcdLine>
                <LcdLine dim>Disconnect GPS to enter manually</LcdLine>
              </>
            ) : (
              <>
                {stages.map((item, index) => (
                  <LcdLine key={item} dim={index !== s.positionInputStage}>
                    {index === s.positionInputStage ? '> ' : '  '}{item}
                  </LcdLine>
                ))}
                <LcdLine dim>[FIN] confirms each field</LcdLine>
              </>
            )}
          </>
        );
        break;
      }
      case 'individual-id-list':
        body = (
          <>
            <LcdLine big>INDIVIDUAL ID</LcdLine>
            {s.individualIds.length === 0 && <LcdLine dim>NO ID</LcdLine>}
            {s.individualIds.map((item, index) => (
              <LcdLine key={`${item.mmsi}-${index}`} dim={index !== s.idCursor}>
                {index === s.idCursor ? '> ' : '  '}{item.label} {item.mmsi}
              </LcdLine>
            ))}
          </>
        );
        break;
      case 'individual-id-add-mmsi':
        body = (
          <>
            <LcdLine big>INDIVIDUAL ID</LcdLine>
            <LcdLine dim>Coast station: first 00 fixed</LcdLine>
            <div style={{ fontSize: 24, letterSpacing: 3, textAlign: 'center', color: LCD_FG }}>
              {s.idEntryMmsi.split('').map((digit, index) => (
                <span key={index} style={{
                  color: index === s.idEntryCursor ? LCD_ALERT : index < 2 ? LCD_FAINT : LCD_FG,
                  textDecoration: index === s.idEntryCursor ? 'underline' : 'none',
                }}>{digit}</span>
              ))}
            </div>
            <LcdLine dim>[^]/[v] digit, [◂]/[▸] cursor, [ENT] next</LcdLine>
          </>
        );
        break;
      case 'individual-id-add-name':
        body = (
          <>
            <LcdLine big>ID NAME</LcdLine>
            <LcdLine>LYNGBY</LcdLine>
            <LcdLine dim>Exam preset for MMSI 002191000</LcdLine>
            <LcdLine dim>[FIN] saves the address</LcdLine>
          </>
        );
        break;
      case 'individual-id-delete': {
        const selected = s.individualIds[s.idCursor];
        body = (
          <>
            <LcdLine big color={LCD_ALERT}>ARE YOU SURE?</LcdLine>
            <LcdLine>{selected?.label ?? 'NO ID'}</LcdLine>
            <LcdLine>{selected?.mmsi ?? ''}</LcdLine>
            <LcdLine dim>[OK] delete / [CANCEL] back</LcdLine>
          </>
        );
        break;
      }
      case 'channel-select':
        body = (
          <>
            <LcdLine big>CHANNEL SELECT</LcdLine>
            <div style={{ fontSize: 46, textAlign: 'center', color: LCD_FG, textShadow: '0 0 10px rgba(var(--lcd-tint),.45)' }}>{ch16.num}</div>
            <LcdLine dim>Use [^]/[v]{s.model === 'M323' ? ' or rotate [DIAL]' : ''}</LcdLine>
          </>
        );
        break;
      case 'backlight':
        body = <CenterGauge label="Backlight" value={s.backlight} max={radioProfile(s.model).maxBacklight} zeroLabel="OFF" />;
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
          if (field === 'address') return s.individualIds[s.odAddress]?.label ?? 'MANUAL';
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
                // While inspecting, this becomes a real keyboard target so a
                // keyboard user can ask "what is this big number".
                role={ins?.on ? 'button' : undefined}
                tabIndex={ins?.on ? 0 : undefined}
                aria-label={ins?.on ? 'channel number readout' : undefined}
                onClick={ins?.on ? () => ins.pick('ch-readout') : undefined}
                onKeyDown={ins?.on ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ins.pick('ch-readout'); }
                } : undefined}
                style={{
                  cursor: ins?.on ? 'help' : undefined,
                  borderRadius: 6,
                  padding: ins?.on ? 2 : 0,
                  outline: ins?.on && ins.key === 'ch-readout' ? `2px solid ${HL}` : 'none',
                }}
              >
                <div style={{ fontSize: 9, letterSpacing: 1, color: LCD_DIM }}>CH</div>
                <div style={{ fontSize: 54, lineHeight: 0.82, color: LCD_FG, textShadow: '0 0 10px rgba(var(--lcd-tint),.45)' }}>
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
      // While inspecting, the screen itself is focusable so a keyboard user can
      // ask "what is this screen" (Enter/Space), matching the pointer behaviour.
      role={ins?.on ? 'button' : undefined}
      tabIndex={ins?.on ? 0 : undefined}
      aria-label={ins?.on ? 'radio display screen' : undefined}
      onClick={ins?.on ? (e) => {
        // Only claim the tap if it did not land on a more specific indicator.
        if ((e.target as HTMLElement).closest('[data-ik]') === e.currentTarget) ins.pick('lcd');
      } : undefined}
      onKeyDown={ins?.on ? (e) => {
        // Only handle keys aimed at the container itself, not a focused child indicator.
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ins.pick('lcd'); }
      } : undefined}
      className={`${lcdFont.className} relative rounded-lg px-3 py-2`}
      style={{
        background: LCD_BG,
        backgroundImage: `${LCD_SCAN}, ${LCD_BG}`,
        border: ins?.on && ins.key === 'lcd' ? `2px solid ${HL}` : '2px solid #0c0f13',
        borderRadius: 9,
        minHeight: 168,
        color: LCD_FG,
        boxShadow: 'inset 0 0 22px rgba(0,0,0,.7), inset 0 0 0 1px rgba(var(--lcd-tint),.06)',
        overflow: 'hidden',
        cursor: ins?.on ? 'pointer' : undefined,
        // The backlight actually dims the screen. The lesson says a bright display
        // at night destroys the dark adaptation you need to see other vessels'
        // lights - and a lesson about brightness on a screen whose brightness never
        // changes is a lesson nobody feels. At OFF the LCD is still readable, just
        // barely, which is exactly how a real one behaves in the dark.
        filter: s.power ? `brightness(${backlightBrightness(s.backlight)})` : undefined,
        transition: 'filter 220ms ease',
      }}
    >
      {s.power && <StatusBar s={s} ins={ins} busy={busy} />}
      <div style={{ minHeight: 96, paddingTop: s.power ? 4 : 0 }}>{body}</div>
      {s.power && <TxMeter s={s} ins={ins} />}
      {/* softkey labels - bottom row, like on the device */}
      {s.power && (
        <div className="mt-1 grid grid-cols-4 gap-1 border-t pt-1" style={{ borderColor: 'rgba(var(--lcd-tint),0.25)' }}>
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
  highlightControl, inspect = false, onInspect, inspectKey = null, busy = false, skin = 'green', realistic = false,
}: Props) {
  const { tp } = useI18n();
  const [coverOpen, setCoverOpen] = useState(false);
  const profile = radioProfile(model);

  // The wide "realistic" faceplate is a 3-column grid whose min-content (softkeys
  // 4x44, keypad 3x44, DISTRESS tab) overflows a phone below ~480px. Under that
  // width we drop the realistic layout into a single stacked column so the 44px
  // keys are preserved (they wrap) and the page never scrolls sideways. The grid
  // (and the identical desktop look) is untouched at >=480px, incl. >=768px.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 479px)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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

  // ---------------------------------------------------------------------------
  // Reusable control blocks. The vertical trainer faceplate and the wide
  // "realistic" IC-M330GE both render the SAME wired controls (same handlers,
  // same data-testid / data-ik, same inspect + highlight behaviour); only the
  // ARRANGEMENT differs. That is the whole point of the realistic layout: the
  // learner meets the real button POSITIONS, not a second set of handlers.
  // ---------------------------------------------------------------------------
  const brandBlock = (
    <div className="flex items-center gap-2">
      <span
        style={{
          width: 15, height: 15, borderRadius: 4,
          background: 'conic-gradient(from 210deg,#0a58c2,#39b0e5,#0a58c2)',
          boxShadow: '0 0 6px rgba(57,176,229,.5)',
        }}
      />
      <span>
        {/* the real faceplate reads "IC-M330" - the GE (GPS) suffix is not printed on it */}
        <span className="block whitespace-nowrap text-[12px] font-bold leading-none tracking-wide text-[#eef3fa]">{realistic ? profile.nameplate.replace('GE', '') : profile.nameplate}</span>
        <span className="block text-[7.5px] font-medium leading-tight tracking-[1.5px] text-[#8b97a8]">DSC CLASS D</span>
      </span>
    </div>
  );

  const brandTag = (
    <span className="text-right text-[7.5px] font-medium leading-tight tracking-[1.4px] text-[#7d8899]">
      VHF MARINE<br />TRANSCEIVER
    </span>
  );

  const lcdBlock = <Lcd s={s} clock={clock} holdPct={holdPct} nextTxSec={nextTxSec} ins={ins} busy={busy} />;

  const softkeysBlock = (
    <div className="grid grid-cols-4 gap-1.5">
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
  );

  // Granular control pieces, so the two layouts can place them differently: the
  // vertical trainer keeps its stacked keypad, the realistic layout arranges them
  // as the real IC-M330GE does (keypad up top, 16/C + knob bottom-right).
  const dialKnob = (
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
      className="relative select-none shrink-0"
      style={{
        width: 76, height: 76, borderRadius: '50%',
        border: inspect && inspectKey === 'dial' ? `2px solid ${HL}` : 'none',
        background: 'radial-gradient(circle at 38% 32%,#565d69,#2b2f38 70%,#1c1f26)',
        boxShadow: 'inset 0 2px 3px rgba(255,255,255,.18), inset 0 -3px 6px rgba(0,0,0,.6), 0 3px 8px rgba(0,0,0,.5)',
        touchAction: 'none',
      }}
    >
      <span style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 4, height: 16, borderRadius: 2, background: '#cfd6e0' }} />
      <span style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%,#3a3f49,#23272f)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,.12)' }} />
    </button>
  );

  const dialCaption = (
    <div className="text-center text-[8px] font-semibold leading-tight tracking-wider text-[#9aa5b4]">
      PWR·VOL·SQL
      <br />
      {/* Lifted from #6b7686 (~3.9:1) to the caption's own #9aa5b4 (~6.9:1). This
          sub-line is the ONLY place the press-vs-hold power gesture is documented. */}
      <span className="text-[#9aa5b4]">
        {tp('жми = VOL/SQL', 'press = VOL/SQL', 'krotko = VOL/SQL')}
        {' · '}
        {tp('держи = PWR', 'hold = PWR', 'przytrzymaj = PWR')}
      </span>
    </div>
  );

  const dialRockers = (
    <div className="flex gap-1.5">
      <Key id="dial-ccw" ik="dial" small ariaLabel="Rotate dial counter-clockwise" onClick={act('dial', () => dispatch({ type: 'dial-rotate', dir: -1 }))}>↺</Key>
      <Key id="dial-cw" ik="dial" small ariaLabel="Rotate dial clockwise" onClick={act('dial', () => dispatch({ type: 'dial-rotate', dir: 1 }))}>↻</Key>
    </div>
  );

  // On the real set the 16/C is a small round BLUE key by the knob; keep it red in
  // the trainer skin where red reads as "the emergency-adjacent one".
  const key16c = (
    <Key
      id="key-16c"
      ik="key-16c"
      round={realistic}
      tone={realistic ? 'blue' : 'red'}
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
  );

  const kLeft = <Key id="key-left" ik="key-left" small ariaLabel="Softkey page left" onClick={act('key-left', () => dispatch({ type: 'soft-page', dir: -1 }))}>◀</Key>;
  const kUp = <Key id="key-up" ik="key-up" small ariaLabel="Up / channel up" onClick={act('key-up', () => dispatch({ type: 'up' }))}>▲</Key>;
  const kRight = <Key id="key-right" ik="key-right" small ariaLabel="Softkey page right" onClick={act('key-right', () => dispatch({ type: 'soft-page', dir: 1 }))}>▶</Key>;
  const kClr = <Key id="key-clr" ik="key-clr" small ariaLabel="Clear / back" onClick={act('key-clr', () => dispatch({ type: 'clr' }))}>{profile.clearLabel}</Key>;
  const kDown = <Key id="key-down" ik="key-down" small ariaLabel="Down / channel down" onClick={act('key-down', () => dispatch({ type: 'down' }))}>▼</Key>;
  const kMenu = <Key id="key-menu" ik="key-menu" small ariaLabel="Menu" onClick={act('key-menu', () => dispatch({ type: 'menu' }))}>MENU</Key>;
  const kEnt = <Key id="key-ent" ik="key-ent" small ariaLabel="Enter" onClick={act('key-ent', () => dispatch({ type: 'ent' }))}>ENT</Key>;

  // Vertical trainer keypad: knob column + keypad column (the original stacked look).
  const knobBlock = (
    <div className="flex flex-col items-center gap-1.5">
      {dialKnob}
      {dialCaption}
      {dialRockers}
    </div>
  );
  const keypadBlock = (
    <div className="flex flex-col gap-1.5">
      {key16c}
      <div className="grid grid-cols-3 gap-1.5">{kLeft}{kUp}{kRight}{kClr}{kDown}{kMenu}</div>
      {kEnt}
    </div>
  );

  // Realistic keypad, arranged like the hardware: CH-up on top, arrows around ENT,
  // then MENU / CH-down / CLR - with the 16/C and the knob at the bottom-right.
  const realControls = (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        <span />{kUp}<span />
        {kLeft}{kEnt}{kRight}
        {kMenu}{kDown}{kClr}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        {key16c}
        {dialKnob}
      </div>
      {dialCaption}
    </div>
  );

  const distressBlock = !coverOpen ? (
    <button
      type="button"
      data-testid="distress-cover"
      data-ik="distress-cover"
      aria-label="Open DISTRESS cover"
      onClick={act('distress-cover', () => setCoverOpen(true))}
      className="relative w-full select-none"
      style={{
        // realistic: a compact red flip-tab, as on the hardware; trainer: a full bar.
        // The realistic tab is 44px (not 38) so its touch target clears the 44px floor.
        height: realistic ? 44 : 46, borderRadius: realistic ? 6 : 9,
        border: inspect && inspectKey === 'distress-cover' ? `2px solid ${HL}` : '2px solid #b23524',
        background: 'repeating-linear-gradient(45deg,#c93a26 0 11px,#a82e1e 11px 22px)',
        color: '#ffe8e2', fontWeight: 700, fontSize: realistic ? 10.5 : 12, letterSpacing: realistic ? 1 : 2,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2), 0 3px 7px rgba(0,0,0,.4)',
      }}
    >
      <span style={{ position: 'absolute', left: realistic ? 7 : 12, top: '50%', transform: 'translateY(-50%)', fontSize: realistic ? 12 : 16 }}>⬒</span>
      {realistic ? 'DISTRESS' : `DISTRESS · ${tp('открой крышку', 'open the cover', 'otworz oslone')}`}
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
        // minHeight 44 gives a full touch target; the transparent background keeps
        // it looking like the same small text link (44px floor, not a visual bar).
        style={{ minHeight: 44, border: 'none', background: 'transparent', color: '#c48a82', fontSize: 10 }}
      >
        {tp('закрыть крышку', 'close the cover', 'zamknij oslone')}
      </button>
    </div>
  );

  const micBlock = (
    <div
      className="mx-auto mt-3 flex items-center gap-3"
      data-ik="mic"
      onClick={inspect ? (e) => {
        const hit = (e.target as HTMLElement).closest('[data-ik]');
        onInspect?.(hit?.getAttribute('data-ik') ?? 'mic');
      } : undefined}
      style={{
        maxWidth: realistic ? 720 : 440,
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
  );

  // The speaker: a tall rounded-rectangle grille of HORIZONTAL louvers on the far
  // left, exactly as on the real IC-M330GE (not a round dot-matrix). The vertical
  // trainer faceplate has no speaker.
  const speakerBlock = (
    <div
      aria-hidden
      className="h-full w-full"
      style={{
        // Full-height grille beside the LCD on desktop; a short strip when the
        // narrow layout stacks it above the screen instead of alongside it.
        minHeight: narrow ? 84 : 150, borderRadius: 9,
        background: 'repeating-linear-gradient(0deg,#05060a 0 2px,#2a2e35 2px 5px)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.75), inset 0 0 0 2px #14161b',
        border: '1px solid #0a0b0e',
      }}
    />
  );

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

      {/* radio body. The realistic faceplate is a graphite hardware body that
          matches the real IC-M330GE product photo; the trainer body is the
          lighter stylised look from the design handoff. */}
      <div
        className="radio-front mx-auto"
        style={{
          // The active skin is injected here as CSS variables; only the LCD
          // subtree reads them, so the grey body stays identical on both skins.
          ...LCD_SKINS[skin],
          // the realistic faceplate is a wide, landscape unit like the real set
          maxWidth: realistic ? 720 : 440,
          background: realistic
            ? 'linear-gradient(180deg,#23262b 0%,#191b1f 58%,#101215 100%)'
            : 'linear-gradient(168deg,#3b414c 0%,#2b303a 55%,#22262e 100%)',
          borderRadius: 16,
          padding: '16px 15px 18px',
          border: realistic ? '1px solid #06070a' : '1px solid #171a20',
          boxShadow: realistic
            ? 'inset 0 1px 0 rgba(255,255,255,.07), inset 0 -2px 9px rgba(0,0,0,.65), 0 14px 30px -14px rgba(0,0,0,.78)'
            : 'inset 0 1px 0 rgba(255,255,255,.14), inset 0 -2px 6px rgba(0,0,0,.4), 0 10px 24px -12px rgba(0,0,0,.6)',
        }}
      >
        {realistic ? (
          // ---- wide realistic IC-M330GE: speaker | screen | controls, the real
          //      front-panel geometry so the learner meets the actual layout ----
          <>
            <div className="mb-3 flex items-center justify-between px-1">
              {brandBlock}
              {brandTag}
            </div>
            {narrow ? (
              // Phone (<480px): a single stacked column - speaker strip, DISTRESS
              // tab, screen + softkeys, then the keypad/knob. Every block spans the
              // full width, so nothing overflows and the 44px keys keep their size.
              <div className="flex flex-col gap-3">
                {speakerBlock}
                {distressBlock}
                <div className="flex min-w-0 flex-col gap-2">
                  {lcdBlock}
                  {softkeysBlock}
                </div>
                {realControls}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1.7fr 1.05fr', gap: 12, alignItems: 'stretch' }}>
                {/* LEFT: louvered speaker (top) + the red DISTRESS flip-tab (bottom) */}
                <div className="flex flex-col gap-2">
                  <div className="min-h-0 flex-1">{speakerBlock}</div>
                  {distressBlock}
                </div>
                {/* CENTER: the screen, with the softkeys directly under it */}
                <div className="flex min-w-0 flex-col gap-2">
                  {lcdBlock}
                  {softkeysBlock}
                </div>
                {/* RIGHT: keypad up top, 16/C + VOL/SQL knob at the bottom-right */}
                <div className="flex flex-col">
                  {realControls}
                </div>
              </div>
            )}
          </>
        ) : (
          // ---- vertical trainer faceplate: the stacked touch layout ----
          <>
            <div className="mb-3 flex items-center justify-between px-0.5">
              {brandBlock}
              {brandTag}
            </div>
            {lcdBlock}
            <div className="mt-2.5">{softkeysBlock}</div>
            <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: '1fr 1.15fr' }}>
              {knobBlock}
              {keypadBlock}
            </div>
            <div className="mt-3 border-t pt-3" style={{ borderColor: '#1b1e25' }}>{distressBlock}</div>
          </>
        )}
      </div>

      {micBlock}
    </div>
  );
}
