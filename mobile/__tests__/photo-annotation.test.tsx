/**
 * PhotoAnnotation: markers sit on the image rectangle actually shown (contain,
 * full frame), for a square image and for a portrait image letterboxed in a
 * wide box; a detail can be chosen from the marker or from the list; exactly
 * one is selected; every target is 44 pt; the image is a bundled asset.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { PhotoAnnotation, type PhotoAnnotationPoint } from '../src/design-system/components/PhotoAnnotation';
import { sailHandlingPhoto } from '../src/lessons/graphics/photos';

const points: PhotoAnnotationPoint[] = [
  { id: 'a', x: 50, y: 50, label: 'Centre', body: 'The middle.' },
  { id: 'b', x: 10, y: 90, label: 'Corner', body: 'Near the bottom left.' },
];
const labels = { hint: 'Tap a number', parts: 'Parts', closeup: 'Closeup', hideMarks: 'Hide markers', showMarks: 'Show markers' };

function renderPhoto(imageWidth: number, imageHeight: number, box: { width: number; height: number }, selectedId = 'a', onSelect = jest.fn()) {
  const view = render(
    <PhotoAnnotation
      source={1}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      points={points}
      selectedId={selectedId}
      onSelect={onSelect}
      description="An image"
      caption="Illustration"
      labels={labels}
    />,
  );
  fireEvent(view.getByTestId('photo-frame'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, ...box } } });
  return view;
}

const place = (view: ReturnType<typeof render>, testID: string) => StyleSheet.flatten(view.getByTestId(testID).props.style);
const centre = (view: ReturnType<typeof render>, id: string) => {
  const st = place(view, `marker-${id}`);
  return { x: (st.left as number) + (st.width as number) / 2, y: (st.top as number) + (st.height as number) / 2, w: st.width, h: st.height };
};

describe('PhotoAnnotation', () => {
  it('square image in a box of the same shape: markers at the catalog percentages', () => {
    const view = renderPhoto(1200, 1200, { width: 300, height: 300 });
    expect(place(view, 'photo-image')).toMatchObject({ left: 0, top: 0, width: 300, height: 300 });
    expect(centre(view, 'a')).toMatchObject({ x: 150, y: 150 });
    expect(centre(view, 'b')).toMatchObject({ x: 30, y: 270 });
  });

  it('portrait image letterboxed in a wide box: markers follow the image, not the box', () => {
    // 675 x 1200 shown 300 pt tall in a 335 pt wide box: 168.75 wide, 83.125 in from the left.
    const view = renderPhoto(675, 1200, { width: 335, height: 300 });
    const img = place(view, 'photo-image');
    expect(img.width).toBeCloseTo(168.75);
    expect(img.left).toBeCloseTo(83.125);
    expect(img.top).toBe(0);
    const a = centre(view, 'a');
    expect(a.x).toBeCloseTo(83.125 + 168.75 / 2);
    expect(a.y).toBeCloseTo(150);
    const b = centre(view, 'b');
    expect(b.x).toBeCloseTo(83.125 + 16.875);
    expect(b.x).not.toBeCloseTo(33.5);
  });

  it('every marker and list item is a 44 pt button with its name and selected state', () => {
    const view = renderPhoto(1200, 1200, { width: 300, height: 300 }, 'b');
    for (const id of ['a', 'b']) {
      const m = centre(view, id);
      expect([m.w, m.h]).toEqual([44, 44]);
    }
    expect(view.getByLabelText('1. Centre').props.accessibilityState).toMatchObject({ selected: false });
    expect(view.getByLabelText('2. Corner').props.accessibilityState).toMatchObject({ selected: true });
    const selectedParts = ['part-a', 'part-b'].filter((id) => view.getByTestId(id).props.accessibilityState?.selected);
    expect(selectedParts).toEqual(['part-b']);
    expect(StyleSheet.flatten(view.getByTestId('part-a').props.style).minHeight).toBe(44);
    // The explanation belongs to the selected detail.
    expect(view.getByRole('header', { name: '2. Corner' })).toBeTruthy();
    expect(view.getByText('Near the bottom left.')).toBeTruthy();
  });

  it('a detail can be chosen on the image or in the list', () => {
    const onSelect = jest.fn();
    const view = renderPhoto(1200, 1200, { width: 300, height: 300 }, 'a', onSelect);
    fireEvent.press(view.getByTestId('marker-b'));
    fireEvent.press(view.getByTestId('part-a'));
    expect(onSelect.mock.calls).toEqual([['b'], ['a']]);
  });

  it('markers can be hidden and shown again; the list stays', () => {
    const view = renderPhoto(1200, 1200, { width: 300, height: 300 });
    fireEvent.press(view.getByText('Hide markers'));
    expect(view.queryByTestId('marker-a')).toBeNull();
    expect(view.getByTestId('part-a')).toBeTruthy();
    fireEvent.press(view.getByText('Show markers'));
    expect(view.getByTestId('marker-a')).toBeTruthy();
  });

  it('the closeup shows the same image around the selected point', () => {
    const view = renderPhoto(1200, 1200, { width: 300, height: 300 });
    fireEvent(view.getByTestId('photo-closeup'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 180 } } });
    const closeup = view.getByTestId('photo-closeup');
    expect(closeup.props.accessibilityLabel).toBe('Closeup: Centre');
    const images = view.UNSAFE_getAllByProps({ source: 1 });
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('lesson photos are bundled assets, never remote', () => {
    // A require() of a file in the app: jest-expo turns it into a local stub,
    // Metro into an asset id. Never a { uri: "https://..." } source.
    expect(JSON.stringify(sailHandlingPhoto.source)).not.toMatch(/https?:/);
    const src = readFileSync(join(__dirname, '..', 'src', 'lessons', 'graphics', 'photos.ts'), 'utf8');
    const required = [...src.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]!);
    expect(required).toEqual(['../../../assets/lessons/sail-handling.jpg']);
    for (const r of required) expect(existsSync(join(__dirname, '..', 'src', 'lessons', 'graphics', r))).toBe(true);
    expect(src).not.toMatch(/uri:/);
    for (const p of sailHandlingPhoto.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });
});
