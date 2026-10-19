// Contract: the native trainer's wheels use the web's mapping unchanged: one
// helm turn = 90 degrees of course, one sheet turn = 25% of the sheet,
// clockwise sheets in, VoiceOver steps of 5 degrees and 5%, a 22% hub dead
// zone, and the native sheet value (1 = sheeted in) read as 0% sheeted in.
import {
  HUB_DEAD_ZONE,
  SMALL_WHEEL,
  a11yStep,
  crossedWind,
  deckLayout,
  easeToSheet,
  helmStepWheelDeg,
  sheetRotation,
  sheetToEase,
  stepSheetEase,
  trackTurn,
  turnHelmCourse,
  turnSheetEase,
  wheelSettings,
} from '../src/simulator/wheel-controls';
import { SHEET_TRAVEL_PER_TURN, WHEEL_DEG_PER_COURSE_DEG } from '../../src/features/trainer-controls/mapping';

const NORTH = 0; // true wind from the top of the screen

describe('helm wheel (course mapping)', () => {
  it('turns the course 90 degrees per full wheel turn, clockwise to starboard', () => {
    expect(WHEEL_DEG_PER_COURSE_DEG).toBe(4);
    expect(turnHelmCourse({ headingDeg: 90, acc: 0 }, 360, 1, NORTH).headingDeg).toBe(180);
    expect(turnHelmCourse({ headingDeg: 120, acc: 0 }, -360, 1, NORTH).headingDeg).toBe(30);
  });

  it('scales with sensitivity and wraps the heading into 0..360', () => {
    expect(turnHelmCourse({ headingDeg: 90, acc: 0 }, 360, 0.5, NORTH).headingDeg).toBe(135);
    expect(turnHelmCourse({ headingDeg: 300, acc: 0 }, 360, 2, 180).headingDeg).toBe(120);
  });

  it('clicks every 5 degrees of course and marks a tack or a gybe', () => {
    expect(turnHelmCourse({ headingDeg: 90, acc: 0 }, 8, 1, NORTH).tick).toBeNull();
    expect(turnHelmCourse({ headingDeg: 90, acc: 0 }, 20, 1, NORTH).tick).toBe('tick');
    expect(turnHelmCourse({ headingDeg: 20, acc: 0 }, -160, 1, NORTH).tick).toBe('turn');
    expect(crossedWind(20, 340, NORTH)).toBe('tack');
    expect(crossedWind(170, 190, NORTH)).toBe('gybe');
    expect(crossedWind(40, 60, NORTH)).toBeNull();
  });

  it('steps 5 degrees of course for VoiceOver whatever the sensitivity', () => {
    for (const s of [0.5, 1, 2] as const) {
      const r = turnHelmCourse({ headingDeg: 90, acc: 0 }, helmStepWheelDeg(1, s), s, NORTH);
      expect(r.headingDeg).toBeCloseTo(95, 9);
      const back = turnHelmCourse({ headingDeg: 90, acc: 0 }, helmStepWheelDeg(-1, s), s, NORTH);
      expect(back.headingDeg).toBeCloseTo(85, 9);
    }
  });
});

describe('sheet wheels', () => {
  it('reads the native sheet value as the shared ease (0% sheeted in, 100% eased out)', () => {
    expect(sheetToEase(1)).toBe(0);
    expect(sheetToEase(0)).toBe(1);
    expect(sheetToEase(0.7)).toBeCloseTo(0.3, 9);
    expect(easeToSheet(0.3)).toBeCloseTo(0.7, 9);
  });

  it('moves the sheet a quarter of its travel per turn, clockwise sheets in', () => {
    expect(SHEET_TRAVEL_PER_TURN).toBe(0.25);
    expect(turnSheetEase(0.5, 360, 1).ease).toBeCloseTo(0.25, 9);
    expect(turnSheetEase(0.5, -360, 1).ease).toBeCloseTo(0.75, 9);
    expect(turnSheetEase(0.1, 360, 1)).toEqual({ ease: 0, tick: 'stop' });
    expect(turnSheetEase(0, 360, 1)).toEqual({ ease: 0, tick: null });
    expect(sheetRotation(0.25)).toBe(-360);
  });

  it('clicks every 5% of sheet', () => {
    expect(turnSheetEase(0.5, -10, 1).tick).toBeNull(); // 0.69%
    expect(turnSheetEase(0.5, -80, 1).tick).toBe('tick'); // 5.6%
  });

  it('steps 5% for VoiceOver: increment eases, decrement sheets in', () => {
    expect(stepSheetEase(0.43, 1)).toEqual({ ease: 0.48, tick: 'tick' });
    expect(stepSheetEase(0.43, -1)).toEqual({ ease: 0.38, tick: 'tick' });
    expect(stepSheetEase(0.98, 1)).toEqual({ ease: 1, tick: 'stop' });
    expect(stepSheetEase(1, 1)).toEqual({ ease: 1, tick: null });
  });
});

describe('touch and accessibility plumbing', () => {
  it('turns by the angle around the center and ignores the 22% hub', () => {
    expect(HUB_DEAD_ZONE).toBe(0.22);
    const d = 200;
    const fromRight = trackTurn(0, d, d / 2, d).last; // 0 deg, east
    expect(trackTurn(fromRight, d / 2, d, d).delta).toBeCloseTo(90, 9); // to south = clockwise
    expect(trackTurn(fromRight, d / 2, 0, d).delta).toBeCloseTo(-90, 9);
    expect(trackTurn(fromRight, d / 2 + 10, d / 2 + 10, d).delta).toBe(0); // inside the hub
  });

  it('maps the adjustable actions to steps', () => {
    expect(a11yStep('increment')).toBe(1);
    expect(a11yStep('decrement')).toBe(-1);
    expect(a11yStep('activate')).toBe(0);
  });

  it('lays out like the web deck and keeps every wheel at least 44 pt', () => {
    const p = deckLayout(360, 250, 'left', null);
    expect(p.helm[0]).toBe(180);
    expect(p.jib[0]).toBeLessThan(p.helm[0]);
    expect(p.main[0]).toBeGreaterThan(p.helm[0]);
    expect(p.helm[2]).toBe(176);
    const swapped = deckLayout(360, 250, 'left', 'main');
    expect(swapped.main).toEqual(p.helm);
    expect(swapped.helm).toEqual(p.main);
    expect(deckLayout(360, 250, 'right', null).main[0]).toBeLessThan(180);
    for (const b of [...Object.values(p), ...Object.values(swapped)]) expect(b[2]).toBeGreaterThanOrEqual(44);
    expect(SMALL_WHEEL).toBeGreaterThanOrEqual(44);
  });

  it('reads sensitivity and the jib sheet side from the shared record', () => {
    expect(wheelSettings({})).toEqual({ sensitivity: 1, jibSheetSide: 'left' });
    expect(wheelSettings({ sensitivity: 2, jibSheetSide: 'right' })).toEqual({ sensitivity: 2, jibSheetSide: 'right' });
    expect(wheelSettings({ sensitivity: 7 }).sensitivity).toBe(1);
  });
});
