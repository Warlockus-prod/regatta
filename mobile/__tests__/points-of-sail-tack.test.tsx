/**
 * N3.1: the tack captions on the points-of-sail wheel must name the tack of
 * the boats drawn on that half. The oracle here is plain vector geometry (which
 * side of the bow the wind comes over), independent of `tackForHeading`, so a
 * swapped helper or a swapped caption both fail.
 */
import { render } from '@testing-library/react-native';
import { Group } from '@shopify/react-native-skia';
import { Text as SvgText } from 'react-native-svg';
import {
  LEFT_HALF_TACK,
  PointsOfSailDiagram,
  RIGHT_HALF_TACK,
} from '../src/design-system/components/PointsOfSailDiagram';
import { tackForHeading } from '../src/courses/tack';

// Screen coordinates, y down, wind from the top (north). A boat glyph points
// up at rotation 0 and turns clockwise with a positive angle.
function windwardSide(headingDeg: number): 'port' | 'starboard' {
  const t = (headingDeg * Math.PI) / 180;
  const starboardBeam = { x: Math.cos(t), y: Math.sin(t) };
  const windSource = { x: 0, y: -1 };
  const dot = starboardBeam.x * windSource.x + starboardBeam.y * windSource.y;
  return dot > 0 ? 'starboard' : 'port';
}

describe('tackForHeading', () => {
  it('wind from the north: a westward course is starboard tack, eastward is port', () => {
    expect(tackForHeading(270)).toBe('starboard');
    expect(tackForHeading(-90)).toBe('starboard');
    expect(tackForHeading(90)).toBe('port');
  });

  it('agrees with the geometry on the diagonals and every shown course', () => {
    for (const h of [45, 135, 225, 315, 30, 52, 85, 150, 170, -30, -52, -85, -135, -170]) {
      expect([h, tackForHeading(h)]).toEqual([h, windwardSide(h)]);
    }
  });

  it('does not guess head to wind or dead downwind from the angle', () => {
    for (const h of [0, 180, 360, -180, 540]) expect(tackForHeading(h)).toBeNull();
  });
});

describe('PointsOfSailDiagram tack captions', () => {
  const size = 300;
  const cx = size / 2;
  const labels = { port: 'Port tack', starboard: 'Starboard tack' };

  // The rendered caption under each half, read back as a tack.
  function captionTacks(view: ReturnType<typeof render>) {
    const captions = view
      .UNSAFE_getAllByType(SvgText)
      .map((n) => ({ x: Number(n.props.x), text: String(n.props.children) }))
      .filter((c) => c.text === 'PORT TACK' || c.text === 'STARBOARD TACK');
    const asTack = (text?: string) =>
      text === 'PORT TACK' ? 'port' : text === 'STARBOARD TACK' ? 'starboard' : null;
    return {
      count: captions.length,
      left: asTack(captions.find((c) => c.x < cx)?.text),
      right: asTack(captions.find((c) => c.x > cx)?.text),
    };
  }

  function renderWheel() {
    return render(
      <PointsOfSailDiagram
        size={size}
        windLabel="Wind"
        activeId={null}
        onSelect={() => {}}
        sectorLabels={[]}
        tackLabels={labels}
      />,
    );
  }

  it('puts starboard tack under the left half and port tack under the right', () => {
    expect(LEFT_HALF_TACK).toBe('starboard');
    expect(RIGHT_HALF_TACK).toBe('port');
    const captions = captionTacks(renderWheel());
    expect(captions).toEqual({ count: 2, left: 'starboard', right: 'port' });
  });

  it('every boat glyph sits under the caption of its own tack', () => {
    const view = renderWheel();
    const captions = captionTacks(view);
    const glyphs = view
      .UNSAFE_getAllByType(Group)
      .map((n) => n.props.transform as { translateX?: number; rotate?: number }[] | undefined)
      .filter((t): t is { translateX?: number; rotate?: number }[] => Array.isArray(t))
      .map((t) => ({
        x: t.find((p) => p.translateX !== undefined)!.translateX!,
        heading: (t.find((p) => p.rotate !== undefined)!.rotate! * 180) / Math.PI,
      }));
    // Four sectors with a boat on each half; head to wind has no glyph.
    expect(glyphs).toHaveLength(8);
    for (const g of glyphs) {
      const captionTack = g.x < cx ? captions.left : captions.right;
      expect([g.heading, captionTack]).toEqual([g.heading, windwardSide(g.heading)]);
    }
  });
});
