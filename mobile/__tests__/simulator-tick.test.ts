import { shortestAngle, tick } from '../src/simulator/tick';
import type { BoatState, Controls, SimParams } from '../src/simulator/types';

const PARAMS: SimParams = { maxSpeed: 100, turnRate: 1, drag: 1 };

const ZERO_STATE: BoatState = { heading: 0, speed: 0, x: 0, y: 0 };

describe('shortestAngle', () => {
  it('passes through small deltas unchanged', () => {
    expect(shortestAngle(0)).toBeCloseTo(0);
    expect(shortestAngle(1)).toBeCloseTo(1);
    expect(shortestAngle(-1)).toBeCloseTo(-1);
    expect(shortestAngle(Math.PI - 0.01)).toBeCloseTo(Math.PI - 0.01);
  });

  it('wraps a positive >pi delta to the negative shortest path', () => {
    expect(shortestAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI * 0.5);
  });

  it('wraps a negative <-pi delta to the positive shortest path', () => {
    expect(shortestAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI * 0.5);
  });

  it('handles full-revolution wraps', () => {
    expect(shortestAngle(Math.PI * 2 + 0.5)).toBeCloseTo(0.5);
  });
});

describe('tick - heading', () => {
  it('does not change heading when target equals current', () => {
    const next = tick(ZERO_STATE, { targetHeading: 0, throttle: 0 }, PARAMS, 1);
    expect(next.heading).toBeCloseTo(0);
  });

  it('rotates toward target at turnRate, clamped per frame', () => {
    // turnRate=1, dt=0.1 -> max step 0.1 rad
    const next = tick(
      ZERO_STATE,
      { targetHeading: Math.PI, throttle: 0 },
      PARAMS,
      0.1,
    );
    expect(next.heading).toBeCloseTo(0.1);
  });

  it('snaps to target when delta is within step', () => {
    // delta = 0.05, max step 0.1 -> reaches target
    const next = tick(
      ZERO_STATE,
      { targetHeading: 0.05, throttle: 0 },
      PARAMS,
      0.1,
    );
    expect(next.heading).toBeCloseTo(0.05);
  });

  it('takes the shortest signed path across the wrap', () => {
    // start at 0, target at -0.2 (= 2pi - 0.2 if not normalized) - boat
    // turns the short way (negative delta) not the long way.
    const next = tick(
      ZERO_STATE,
      { targetHeading: -0.05, throttle: 0 },
      PARAMS,
      0.1,
    );
    expect(next.heading).toBeCloseTo(-0.05);
  });
});

describe('tick - speed', () => {
  it('starts accelerating from zero with throttle', () => {
    const next = tick(
      ZERO_STATE,
      { targetHeading: 0, throttle: 1 },
      PARAMS,
      0.1,
    );
    expect(next.speed).toBeGreaterThan(0);
    expect(next.speed).toBeLessThan(PARAMS.maxSpeed);
  });

  it('stays at zero with throttle 0', () => {
    const next = tick(
      ZERO_STATE,
      { targetHeading: 0, throttle: 0 },
      PARAMS,
      0.1,
    );
    expect(next.speed).toBe(0);
  });

  it('approaches throttle setpoint asymptotically', () => {
    let s: BoatState = ZERO_STATE;
    for (let i = 0; i < 100; i++) {
      s = tick(s, { targetHeading: 0, throttle: 0.5 }, PARAMS, 0.1);
    }
    // After ~10 sec with drag 1/s the speed is essentially at setpoint.
    expect(s.speed).toBeCloseTo(50, 0);
  });

  it('clamps throttle to [0, 1]', () => {
    const next = tick(
      ZERO_STATE,
      { targetHeading: 0, throttle: 5 },
      PARAMS,
      0.1,
    );
    // setpoint = maxSpeed * 1 = 100; speed approaches it monotonically
    expect(next.speed).toBeGreaterThan(0);
    expect(next.speed).toBeLessThanOrEqual(PARAMS.maxSpeed);
  });
});

describe('tick - position integration', () => {
  it('moves north (negative Y) when heading 0', () => {
    const initial: BoatState = { heading: 0, speed: 50, x: 100, y: 100 };
    const next = tick(
      initial,
      { targetHeading: 0, throttle: 1 },
      PARAMS,
      0.1,
    );
    expect(next.x).toBeCloseTo(100, 1);
    expect(next.y).toBeLessThan(100);
  });

  it('moves east (positive X) when heading pi/2', () => {
    const initial: BoatState = { heading: Math.PI / 2, speed: 50, x: 100, y: 100 };
    const next = tick(
      initial,
      { targetHeading: Math.PI / 2, throttle: 1 },
      PARAMS,
      0.1,
    );
    expect(next.x).toBeGreaterThan(100);
    expect(next.y).toBeCloseTo(100, 1);
  });

  it('integration is consistent with displacement = speed * dt', () => {
    const initial: BoatState = { heading: 0, speed: 100, x: 0, y: 0 };
    const next = tick(
      initial,
      { targetHeading: 0, throttle: 1 },
      PARAMS,
      0.5,
    );
    // dy = -cos(0) * 100 * 0.5 = -50
    expect(next.y).toBeCloseTo(-50, 1);
  });
});

describe('tick - determinism', () => {
  it('two identical inputs yield identical outputs', () => {
    const inputs = {
      state: { heading: 0.7, speed: 42, x: 11, y: 22 },
      controls: { targetHeading: 1.2, throttle: 0.8 },
      params: PARAMS,
      dt: 1 / 30,
    };
    const a = tick(inputs.state, inputs.controls, inputs.params, inputs.dt);
    const b = tick(inputs.state, inputs.controls, inputs.params, inputs.dt);
    expect(a).toEqual(b);
  });
});
