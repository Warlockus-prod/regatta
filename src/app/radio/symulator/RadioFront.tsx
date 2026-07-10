'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  CHANNELS, MENU_ITEMS, NATURES, OTHERDSC_CATEGORIES, OTHERDSC_TYPES,
  channel, effectivePower, softkeys,
  type RadioEvent, type RadioState,
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

export type RadioModel = 'M330' | 'M323';

interface Props {
  s: RadioState;
  dispatch: (e: RadioEvent) => void;
  /** which ICOM faceplate to render (same state machine underneath). */
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
}

function Key({
  id, children, onClick, onPointerDown, onPointerUp, onPointerLeave,
  wide, round, tone = 'grey', disabled, small, ariaLabel,
}: {
  id: string; children: ReactNode; onClick?: () => void;
  onPointerDown?: () => void; onPointerUp?: () => void; onPointerLeave?: () => void;
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
      className={`select-none font-bold text-white/85 transition active:scale-95 disabled:opacity-35 ${
        round ? 'rounded-full' : 'rounded-md'
      } ${wide ? 'col-span-2' : ''} ${small ? 'min-h-[42px] px-1 text-[10px]' : 'min-h-[44px] px-2 text-[11px]'}`}
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
        body = <CenterGauge label="Volume" value={s.volume} />;
        break;
      case 'squelch':
        body = <CenterGauge label="SQL" value={s.squelch} />;
        break;
      case 'menu':
        body = (
          <>
            <LcdLine big>MENU</LcdLine>
            {MENU_ITEMS.map((m, i) => (
              <LcdLine key={m} dim={i !== s.menuCursor}>{i === s.menuCursor ? '> ' : '  '}{m}</LcdLine>
            ))}
          </>
        );
        break;
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
      case 'otherdsc-compose':
        body = (
          <>
            <LcdLine big>OTHER DSC</LcdLine>
            <LcdLine dim={s.odCursor !== 0}>{s.odCursor === 0 ? '> ' : '  '}Type: {OTHERDSC_TYPES[s.odType]}</LcdLine>
            <LcdLine dim={s.odCursor !== 1}>{s.odCursor === 1 ? '> ' : '  '}Category: {OTHERDSC_CATEGORIES[s.odCategory]}</LcdLine>
            <LcdLine dim={s.odCursor !== 2}>{s.odCursor === 2 ? '> ' : '  '}[ Send on CH 70 ]</LcdLine>
          </>
        );
        break;
      case 'otherdsc-field': {
        const list = s.odField === 'type' ? OTHERDSC_TYPES : OTHERDSC_CATEGORIES;
        body = (
          <>
            <LcdLine big>{s.odField === 'type' ? 'CALL TYPE' : 'CATEGORY'}</LcdLine>
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
            <LcdLine>CH 16 selected for voice</LcdLine>
            <LcdLine dim>Hold [PTT] to transmit</LcdLine>
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
                <div>{s.ptt ? 'TX' : 'STBY'} · INT</div>
                <div>{effectivePower(s)}{s.gpsValid ? ' · GPS' : ''}</div>
              </div>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, textAlign: 'center', color: s.ptt ? '#ff8a7a' : AMBER, letterSpacing: 2, lineHeight: 1.15 }}>
              {ch16.num}
            </div>
            <div style={{ fontSize: 10, color: AMBER_DIM, textAlign: 'center' }}>
              {ch16.label ?? (ch16.lowOnly ? 'LOW POWER ONLY' : 'SIMPLEX')}
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

function CenterGauge({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ paddingTop: 26 }}>
      <LcdLine big>{label}: {value}</LcdLine>
      <div className="mt-2 h-3 w-full overflow-hidden rounded" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div style={{ width: `${value * 10}%`, height: '100%', background: AMBER }} />
      </div>
      <LcdLine dim>rotate [DIAL] · push = next</LcdLine>
    </div>
  );
}

// ------------------------------------------------------------- panel -------

export default function RadioFront({
  s, dispatch, model = 'M330', holdPct, onDistressDown, onDistressUp, onPttDown, onPttUp, clock, nextTxSec,
}: Props) {
  const { tp } = useI18n();
  const [coverOpen, setCoverOpen] = useState(false);
  // Faceplate differences (IC-M323 manual): the clear key is silkscreened
  // CLEAR, not CLR. DSC procedures modeled after the IC-M330 firmware.
  const clrLabel = model === 'M323' ? 'CLEAR' : 'CLR';
  const nameplate = model === 'M323' ? 'ICOM · IC-M323' : 'ICOM · IC-M330GE';
  const dialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialFiredHold = useRef(false);

  // [DIAL]: short press = volume/squelch, hold >= 600 ms = power (manual: 1 s).
  const dialDown = useCallback(() => {
    dialFiredHold.current = false;
    dialTimer.current = setTimeout(() => {
      dialFiredHold.current = true;
      dispatch({ type: 'dial-hold' });
    }, 600);
  }, [dispatch]);
  const dialUp = useCallback(() => {
    if (dialTimer.current) clearTimeout(dialTimer.current);
    if (!dialFiredHold.current) dispatch({ type: 'dial-push' });
  }, [dispatch]);
  const dialCancel = useCallback(() => {
    if (dialTimer.current) clearTimeout(dialTimer.current);
    dialFiredHold.current = true; // a cancelled gesture must not fire dial-push later
  }, []);
  useEffect(() => () => { if (dialTimer.current) clearTimeout(dialTimer.current); }, []);

  return (
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(180deg,#2b333c,#171d24)', border: '1px solid var(--border-subtle)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-widest text-white/60">{nameplate}</span>
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
              <Key key={i} id={`soft-${i}`} small tone="soft" disabled={!s.power || !k} onClick={() => dispatch({ type: 'soft', index: i })}>
                {k || '·'}
              </Key>
            ))}
          </div>
        </div>

        {/* right column: nav cluster + 16/C + DIAL */}
        <div className="order-3 flex w-[118px] flex-1 flex-col items-center gap-1.5 sm:max-w-[130px] sm:flex-none">
          <div className="grid w-full grid-cols-3 gap-1">
            <Key id="key-left" small ariaLabel="Softkey page left" onClick={() => dispatch({ type: 'soft-page', dir: -1 })}>◀</Key>
            <Key id="key-up" small ariaLabel="Up / channel up" onClick={() => dispatch({ type: 'up' })}>▲</Key>
            <Key id="key-right" small ariaLabel="Softkey page right" onClick={() => dispatch({ type: 'soft-page', dir: 1 })}>▶</Key>
            <Key id="key-clr" small ariaLabel="Clear / back" onClick={() => dispatch({ type: 'clr' })}>{clrLabel}</Key>
            <Key id="key-down" small ariaLabel="Down / channel down" onClick={() => dispatch({ type: 'down' })}>▼</Key>
            <Key id="key-menu" small ariaLabel="Menu" onClick={() => dispatch({ type: 'menu' })}>MENU</Key>
          </div>
          <Key id="key-ent" small wide ariaLabel="Enter" onClick={() => dispatch({ type: 'ent' })}>ENT</Key>
          <Key id="key-16c" round tone="blue" ariaLabel="Channel 16" onClick={() => dispatch({ type: 'key-16c' })}>
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
