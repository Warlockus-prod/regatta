'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  DSC_ADDRESSES, DSC_VOICE_CHANNELS, NATURES, OTHERDSC_CATEGORIES, OTHERDSC_TYPES,
  channel, dscFieldValues, effectivePower, menuItems, otherDscRows, radioProfile, softkeys,
  type OtherDscField, type RadioEvent, type RadioModel, type RadioState,
} from './radioModel';

// ============================================================================
// Visual front panel of the IC-M330GE. Layout follows the manual's panel
// description: speaker + red DISTRESS under a flip cover (left), dot-matrix
// LCD (center), ENT/arrows/CLR/MENU cluster + round 16/C + PWR/VOL/SQL dial
// (right), 4 softkeys under the display. The PTT lives on the fist mic - here
// a separate hold-button below the panel.
// ============================================================================

const AMBER = '#ffb84d';
const AMBER_DIM = 'rgba(255,184,77,0.55)';
const LCD_BG = 'radial-gradient(120% 130% at 50% 0%, #3a2a10, #241806 70%)';

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
}

function Key({
  id, children, onClick, onPointerDown, onPointerUp, onPointerLeave,
  onKeyDown, onKeyUp, wide, round, tone = 'grey', disabled, small, ariaLabel,
}: {
  id: string; children: ReactNode; onClick?: () => void;
  onPointerDown?: () => void; onPointerUp?: () => void; onPointerLeave?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  wide?: boolean; round?: boolean; tone?: 'grey' | 'blue' | 'red' | 'soft'; disabled?: boolean; small?: boolean;
  ariaLabel?: string;
}) {
  const bg =
    tone === 'red' ? 'linear-gradient(180deg,#e84c3d,#b02418)'
    : tone === 'blue' ? 'linear-gradient(180deg,#3d6f8e,#27506b)'
    : tone === 'soft' ? 'linear-gradient(180deg,#3a4550,#252e38)'
    : 'linear-gradient(180deg,#39424c,#232b33)';
  return (
    <button
      type="button"
      data-testid={id}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      className={`select-none font-bold text-white/85 transition active:scale-95 disabled:opacity-35 ${
        round ? 'rounded-full' : 'rounded-md'
      } ${wide ? 'col-span-2' : ''} ${small ? 'min-h-[44px] min-w-[44px] px-1 text-[10px]' : 'min-h-[44px] px-2 text-[11px]'}`}
      style={{ background: bg, border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 2px 4px rgba(0,0,0,0.5)', touchAction: 'none' }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- LCD ------

function LcdLine({ children, big, dim, color }: { children: ReactNode; big?: boolean; dim?: boolean; color?: string }) {
  return (
    <div style={{
      color: color ?? (dim ? AMBER_DIM : AMBER),
      fontSize: big ? 15 : 11,
      fontWeight: big ? 700 : 500,
      lineHeight: 1.45,
      letterSpacing: 0.3,
    }}>
      {children}
    </div>
  );
}

function Lcd({ s, clock, holdPct, nextTxSec }: { s: RadioState; clock: string; holdPct: number; nextTxSec: number }) {
  const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  const ch16 = channel(s);
  const keys = softkeys(s);

  let body: ReactNode;
  if (!s.power) {
    body = <div style={{ color: 'rgba(255,184,77,0.25)', textAlign: 'center', paddingTop: 52, fontSize: 11 }}>&nbsp;</div>;
  } else {
    switch (s.screen) {
      case 'volume':
        body = <CenterGauge label="Volume" value={s.volume} max={radioProfile(s.model).maxVolume} />;
        break;
      case 'squelch':
        body = <CenterGauge label="SQL" value={s.squelch} />;
        break;
      case 'channel-select':
        body = (
          <>
            <LcdLine big>CHANNEL SELECT</LcdLine>
            <div style={{ fontSize: 46, fontWeight: 800, textAlign: 'center', color: AMBER }}>{ch16.num}</div>
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
            <LcdLine big>MENU</LcdLine>
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
            <LcdLine big>DSC CALLS</LcdLine>
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
            <LcdLine big color="#ff8a7a">DISTRESS</LcdLine>
            <LcdLine dim>Push [DISTRESS] for 3 sec.</LcdLine>
            <LcdLine dim={s.composeCursor !== 0}>{s.composeCursor === 0 ? '> ' : '  '}Nature: {NATURES[s.natureIndex]} &gt;</LcdLine>
            <LcdLine dim={s.composeCursor !== 1}>{s.composeCursor === 1 ? '> ' : '  '}Position: {s.gpsValid ? 'GPS' : 'NO GPS - enter!'}</LcdLine>
          </>
        );
        break;
      case 'distress-nature':
        body = (
          <>
            <LcdLine big color="#ff8a7a">NATURE OF DISTRESS</LcdLine>
            {NATURES.slice(Math.max(0, s.natureCursor - 2), Math.max(0, s.natureCursor - 2) + 5).map((n) => {
              const idx = NATURES.indexOf(n);
              return <LcdLine key={n} dim={idx !== s.natureCursor}>{idx === s.natureCursor ? '> ' : '  '}{n}</LcdLine>;
            })}
          </>
        );
        break;
      case 'distress-hold':
        body = (
          <>
            <LcdLine big color="#ff8a7a">!! DISTRESS !!</LcdLine>
            <LcdLine>Hold Down for 3 sec.</LcdLine>
            <div className="mt-2 h-3 w-full overflow-hidden rounded" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ width: `${Math.round(holdPct * 100)}%`, height: '100%', background: '#ff6a5a', transition: 'width 60ms linear' }} />
            </div>
            <LcdLine dim>{(holdPct * 3).toFixed(1)} s</LcdLine>
          </>
        );
        break;
      case 'distress-tx':
        body = (
          <>
            <LcdLine big color="#ff8a7a">!! DISTRESS !!</LcdLine>
            <LcdLine>Transmitting Distress Alert</LcdLine>
            <LcdLine dim>CH 70 · {NATURES[s.natureIndex]}</LcdLine>
          </>
        );
        break;
      case 'distress-wait':
        body = (
          <>
            <LcdLine big color="#ff8a7a">!! DISTRESS !!</LcdLine>
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
            <LcdLine color="#ff8a7a">♪ ALARM ♪</LcdLine>
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
            <LcdLine big color="#ff8a7a">DISTRESS CANCEL</LcdLine>
            <LcdLine>will transmit DSC cancel.</LcdLine>
          </>
        );
        break;
      case 'cancel-tx':
        body = (
          <>
            <LcdLine big color="#ff8a7a">DISTRESS CANCEL</LcdLine>
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
            <LcdLine big>OTHER DSC</LcdLine>
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
            <LcdLine color="#ff8a7a">♪ ALARM ♪</LcdLine>
          </>
        );
        break;
      case 'rx-distress-alert':
        body = (
          <>
            <LcdLine big color="#ff8a7a">RCVD DISTRESS</LcdLine>
            <LcdLine>FROM: {s.rxDistress?.name}</LcdLine>
            <LcdLine dim>MMSI {s.rxDistress?.mmsi}</LcdLine>
            <LcdLine dim>{s.rxDistress?.spoken}</LcdLine>
            <LcdLine dim>Nature: {s.rxDistress?.nature}</LcdLine>
            <LcdLine color="#ff8a7a">♪ ALARM ♪</LcdLine>
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
          <>
            <div className="flex items-start justify-between">
              <div style={{ fontSize: 10, color: AMBER_DIM }}>
                <div>{s.gpsValid ? `${s.pos.lat} ${s.pos.lon}` : 'NO POS'}</div>
                <div>{s.gpsValid ? `${clock} UTC` : 'NO TIME'}</div>
              </div>
              <div style={{ fontSize: 10, color: AMBER_DIM, textAlign: 'right' }}>
                <div>{s.ptt ? 'TX' : s.aquaActive ? 'AQUA' : 'STBY'} · INT</div>
                <div>{effectivePower(s)}{s.gpsValid ? ' · GPS' : ''}{s.dualWatch ? ' · DW' : ''}{s.scanActive ? ' · SCAN' : ''}</div>
              </div>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, textAlign: 'center', color: s.ptt ? '#ff8a7a' : AMBER, letterSpacing: 2, lineHeight: 1.15 }}>
              {ch16.num}
            </div>
            <div style={{ fontSize: 10, color: AMBER_DIM, textAlign: 'center' }}>
              {s.favoriteChannels.includes(ch16.num) ? '★ ' : ''}{ch16.label ?? (ch16.lowOnly ? 'LOW POWER ONLY' : 'SIMPLEX')}
            </div>
          </>
        );
      }
    }
  }

  return (
    <div data-testid="lcd" className="rounded-md px-3 py-2" style={{ background: LCD_BG, border: '2px solid #0d0a05', minHeight: 158, fontFamily: mono, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.65)' }}>
      {body}
      {/* softkey labels - bottom row, like on the device */}
      {s.power && (
        <div className="mt-2 grid grid-cols-4 gap-1 border-t pt-1" style={{ borderColor: 'rgba(255,184,77,0.25)' }}>
          {keys.map((k, i) => (
            <div key={i} style={{ fontSize: 8.5, textAlign: 'center', color: k ? AMBER : 'transparent', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {k || '.'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CenterGauge({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  return (
    <div style={{ paddingTop: 26 }}>
      <LcdLine big>{label}: {value}</LcdLine>
      <div className="mt-2 h-3 w-full overflow-hidden rounded" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: AMBER }} />
      </div>
      <LcdLine dim>rotate [DIAL] · push = next</LcdLine>
    </div>
  );
}

// ------------------------------------------------------------- panel -------

export default function RadioFront({
  s, dispatch, model = s.model, holdPct, onDistressDown, onDistressUp, onPttDown, onPttUp, clock, nextTxSec, highlightControl,
}: Props) {
  const { tp } = useI18n();
  const [coverOpen, setCoverOpen] = useState(false);
  const profile = radioProfile(model);
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
    <div data-radio-highlight={highlightControl} className="radio-front rounded-2xl p-4" style={{ background: 'linear-gradient(180deg,#2b333c,#171d24)', border: '1px solid var(--border-subtle)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
      {highlightControl && (
        <style>{`
          [data-radio-highlight="${highlightControl}"] [data-testid="${highlightControl}"] {
            outline: 3px solid var(--accent-cyan);
            outline-offset: 3px;
            animation: radio-control-pulse 1.35s ease-in-out infinite;
          }
          @keyframes radio-control-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.2); }
            50% { box-shadow: 0 0 0 8px rgba(0, 212, 255, 0); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-radio-highlight="${highlightControl}"] [data-testid="${highlightControl}"] { animation: none; }
          }
        `}</style>
      )}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-widest text-white/60">{profile.nameplate}</span>
        <span className="text-[10px] text-white/40">VHF MARINE TRANSCEIVER</span>
      </div>

      {/* Mobile: LCD block first at full width, control columns wrap below.
          Desktop (sm+): manual layout - speaker/DISTRESS | LCD | key cluster. */}
      <div className="flex flex-wrap gap-3">
        {/* left column: speaker + DISTRESS under cover */}
        <div className="order-2 flex w-[86px] flex-1 flex-col items-center gap-2 sm:order-1 sm:max-w-[86px] sm:flex-none">
          <div className="grid grid-cols-6 gap-[3px] pt-1 opacity-50">
            {Array.from({ length: 36 }, (_, i) => (
              <span key={i} className="h-[5px] w-[5px] rounded-full" style={{ background: '#0c0f13' }} />
            ))}
          </div>
          <div className="relative mt-1 w-full">
            {/* the red key */}
            <button
              type="button"
              data-testid="distress-key"
              disabled={!coverOpen}
              onPointerDown={onDistressDown}
              onPointerUp={onDistressUp}
              onPointerLeave={onDistressUp}
              onPointerCancel={onDistressUp}
              onKeyDown={(e) => {
                if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); onDistressDown(); }
              }}
              onKeyUp={(e) => {
                if (isActivationKey(e.key)) { e.preventDefault(); onDistressUp(); }
              }}
              className="flex min-h-[54px] w-full select-none flex-col items-center justify-center rounded-md text-[10px] font-extrabold text-white transition active:scale-95 disabled:opacity-100"
              style={{ background: 'linear-gradient(180deg,#e84c3d,#a81f14)', border: '1px solid rgba(0,0,0,0.4)', boxShadow: '0 2px 6px rgba(0,0,0,0.5)', touchAction: 'none' }}
            >
              DISTRESS
              <span className="text-[8px] font-medium opacity-80">hold 3 sec</span>
            </button>
            {/* flip cover */}
            <button
              type="button"
              data-testid="distress-cover"
              aria-label={coverOpen ? 'Close DISTRESS cover' : 'Open DISTRESS cover'}
              onClick={() => setCoverOpen((v) => !v)}
              className="absolute inset-0 flex items-end justify-center rounded-md text-[9px] font-bold transition-transform"
              style={{
                background: coverOpen ? 'transparent' : 'linear-gradient(180deg, rgba(200,60,45,0.35), rgba(120,20,12,0.45))',
                border: coverOpen ? 'none' : '1px solid rgba(255,120,100,0.5)',
                color: coverOpen ? 'transparent' : '#ffd9d3',
                transform: coverOpen ? 'translateY(-110%) scaleY(0.12)' : 'none',
                transformOrigin: 'top',
                pointerEvents: coverOpen ? 'none' : 'auto',
                backdropFilter: coverOpen ? 'none' : 'blur(1.5px)',
              }}
            >
              {!coverOpen && <span className="pb-1">COVER · {tp('открой', 'open', 'otworz')}</span>}
            </button>
            {coverOpen && (
              <button
                type="button"
                onClick={() => setCoverOpen(false)}
                className="mt-1 w-full rounded text-[8px] text-white/50"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {tp('закрыть крышку', 'close the cover', 'zamknij oslone')}
              </button>
            )}
          </div>
        </div>

        {/* center: LCD + softkeys */}
        <div className="order-1 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1">
          <Lcd s={s} clock={clock} holdPct={holdPct} nextTxSec={nextTxSec} />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {softkeys(s).map((k, i) => (
              <Key
                key={i}
                id={`soft-${i}`}
                small
                tone="soft"
                disabled={!s.power || !k}
                onClick={k === 'AQUA' ? undefined : () => dispatch({ type: 'soft', index: i })}
                onPointerDown={k === 'AQUA' ? () => dispatch({ type: 'aqua-down' }) : undefined}
                onPointerUp={k === 'AQUA' ? () => dispatch({ type: 'aqua-up' }) : undefined}
                onPointerLeave={k === 'AQUA' ? () => dispatch({ type: 'aqua-up' }) : undefined}
                onKeyDown={k === 'AQUA' ? (e) => {
                  if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); dispatch({ type: 'aqua-down' }); }
                } : undefined}
                onKeyUp={k === 'AQUA' ? (e) => {
                  if (isActivationKey(e.key)) { e.preventDefault(); dispatch({ type: 'aqua-up' }); }
                } : undefined}
              >
                {k || '·'}
              </Key>
            ))}
          </div>
        </div>

        {/* right column: nav cluster + 16/C + DIAL */}
        <div className="order-3 flex min-w-[156px] flex-1 flex-col items-center gap-1.5 sm:max-w-[156px] sm:flex-none">
          <div className="grid w-full grid-cols-3 gap-1">
            <Key id="key-left" small ariaLabel="Softkey page left" onClick={() => dispatch({ type: 'soft-page', dir: -1 })}>◀</Key>
            <Key id="key-up" small ariaLabel="Up / channel up" onClick={() => dispatch({ type: 'up' })}>▲</Key>
            <Key id="key-right" small ariaLabel="Softkey page right" onClick={() => dispatch({ type: 'soft-page', dir: 1 })}>▶</Key>
            <Key id="key-clr" small ariaLabel="Clear / back" onClick={() => dispatch({ type: 'clr' })}>{profile.clearLabel}</Key>
            <Key id="key-down" small ariaLabel="Down / channel down" onClick={() => dispatch({ type: 'down' })}>▼</Key>
            <Key id="key-menu" small ariaLabel="Menu" onClick={() => dispatch({ type: 'menu' })}>MENU</Key>
          </div>
          <Key id="key-ent" small wide ariaLabel="Enter" onClick={() => dispatch({ type: 'ent' })}>ENT</Key>
          <Key
            id="key-16c"
            round
            tone="blue"
            ariaLabel="Channel 16, hold for Call Channel"
            onPointerDown={callDown}
            onPointerUp={callUp}
            onPointerLeave={callCancel}
            onKeyDown={(e) => {
              if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); callDown(); }
            }}
            onKeyUp={(e) => {
              if (isActivationKey(e.key)) { e.preventDefault(); callUp(); }
            }}
          >
            <span className="px-2 py-1">16/C</span>
          </Key>
          {/* DIAL: rotate via side arrows, push/hold via center */}
          <div className="mt-1 flex items-center gap-1">
            <Key id="dial-ccw" small ariaLabel="Rotate dial counter-clockwise" onClick={() => dispatch({ type: 'dial-rotate', dir: -1 })}>↺</Key>
            <button
              type="button"
              data-testid="dial-center"
              aria-label="Dial: press for volume/squelch, hold for power"
              onPointerDown={dialDown}
              onPointerUp={dialUp}
              onPointerLeave={dialCancel}
              onPointerCancel={dialCancel}
              onKeyDown={(e) => {
                if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); dialDown(); }
              }}
              onKeyUp={(e) => {
                if (isActivationKey(e.key)) { e.preventDefault(); dialUp(); }
              }}
              className="flex h-[52px] w-[52px] select-none items-center justify-center rounded-full text-[8px] font-bold text-white/70 transition active:scale-95"
              style={{ background: 'radial-gradient(circle at 35% 30%, #4a545f, #20262d 70%)', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 3px 8px rgba(0,0,0,0.6)', touchAction: 'none' }}
            >
              PWR·VOL·SQL
            </button>
            <Key id="dial-cw" small ariaLabel="Rotate dial clockwise" onClick={() => dispatch({ type: 'dial-rotate', dir: 1 })}>↻</Key>
          </div>
          <div className="text-center text-[9px] leading-tight text-white/50">
            {tp('коротко = VOL/SQL', 'press = VOL/SQL', 'krotko = VOL/SQL')}<br />
            {tp('удержи = PWR', 'hold = PWR', 'przytrzymaj = PWR')}
          </div>
        </div>
      </div>

      {/* fist mic PTT */}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          data-testid="ptt"
          onPointerDown={onPttDown}
          onPointerUp={onPttUp}
          onPointerLeave={onPttUp}
          onPointerCancel={onPttUp}
          onKeyDown={(e) => {
            if (!e.repeat && isActivationKey(e.key)) { e.preventDefault(); onPttDown(); }
          }}
          onKeyUp={(e) => {
            if (isActivationKey(e.key)) { e.preventDefault(); onPttUp(); }
          }}
          className="flex min-h-[52px] flex-1 select-none items-center justify-center gap-2 rounded-xl text-sm font-extrabold text-white transition active:scale-[0.98]"
          style={{
            background: s.ptt ? 'linear-gradient(180deg,#e84c3d,#a81f14)' : 'linear-gradient(180deg,#39424c,#232b33)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
            touchAction: 'none',
          }}
        >
          🎙️ PTT {s.ptt ? '· TX' : ''}
          <span className="text-[9px] font-medium opacity-70">{tp('держи = передача', 'hold = transmit', 'trzymaj = nadajesz')}</span>
        </button>
        <div className="text-[9px] leading-tight text-white/50">
          {tp('ручной', 'fist', 'mikrofon')}<br />{tp('микрофон', 'mic', 'reczny')}
        </div>
      </div>
    </div>
  );
}
