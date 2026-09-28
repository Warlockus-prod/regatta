import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, type ImageRequireSource, type LayoutChangeEvent } from 'react-native';
import { Text } from './Text';
import { bySurface, useSurface } from '../surface';
import { radii } from '../tokens';
import { closeupFrame, containRect, pointInRect } from '../../lessons/graphics/layout';

export interface PhotoAnnotationPoint {
  id: string;
  /** Percent of the full original image, from the left / top. */
  x: number;
  y: number;
  label: string;
  body: string;
}

interface PhotoAnnotationProps {
  /** A bundled image (require): annotated images never load from the network. */
  source: ImageRequireSource;
  /** Pixel size of the original image. */
  imageWidth: number;
  imageHeight: number;
  points: PhotoAnnotationPoint[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Spoken description of the whole image. */
  description: string;
  /** What kind of image this is and what it cannot be used for. */
  caption: string;
  labels: { hint: string; parts: string; closeup: string; hideMarks: string; showMarks: string };
  /** Tallest the image may be (pt). A taller image is letterboxed, never cropped. */
  maxHeight?: number;
  /** Closeup magnification of the same image. */
  closeupZoom?: number;
}

const TOUCH = 44;

/**
 * An image with numbered markers on its details, a list of the same details
 * underneath, and the selected detail explained with a closeup of the same
 * image. The whole frame is shown ("contain"): catalog points are percent of
 * the full original, so markers are placed on the rectangle the image actually
 * occupies inside the measured box, letterbox included. One detail is
 * selected at a time; every marker and list item is a 44 pt target with its
 * name and selected state for VoiceOver. Nothing is written onto the image.
 */
export function PhotoAnnotation({
  source,
  imageWidth,
  imageHeight,
  points,
  selectedId,
  onSelect,
  description,
  caption,
  labels,
  maxHeight = 420,
  closeupZoom = 2.5,
}: PhotoAnnotationProps) {
  const s = styles[useSurface()];
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [closeupWidth, setCloseupWidth] = useState(0);
  const [marks, setMarks] = useState(true);
  const selectedIndex = Math.max(0, points.findIndex((p) => p.id === selectedId));
  const selected = points[selectedIndex];
  const rect = box ? containRect(box.w, box.h, imageWidth, imageHeight) : null;
  const onFrame = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!box || box.w !== width || box.h !== height) setBox({ w: width, h: height });
  };
  const closeupHeight = Math.round(closeupWidth * 0.6);
  const frame = selected && closeupWidth > 0
    ? closeupFrame(closeupWidth, closeupHeight, imageWidth, imageHeight, selected.x, selected.y, closeupZoom)
    : null;
  return (
    <View style={s.wrap}>
      <View
        testID="photo-frame"
        onLayout={onFrame}
        style={[s.frame, box ? { height: Math.min((box.w * imageHeight) / imageWidth, maxHeight) } : { aspectRatio: imageWidth / imageHeight, maxHeight }]}
      >
        {rect ? (
          <View
            testID="photo-image"
            accessible
            accessibilityRole="image"
            accessibilityLabel={description}
            style={[s.imageBox, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]}
          >
            <Image source={source} style={{ width: rect.width, height: rect.height }} accessibilityIgnoresInvertColors />
          </View>
        ) : null}
        {rect && marks
          ? points.map((p, i) => {
              const at = pointInRect(rect, p.x, p.y);
              const on = p.id === selected?.id;
              return (
                <Pressable
                  key={p.id}
                  testID={`marker-${p.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1}. ${p.label}`}
                  accessibilityState={{ selected: on }}
                  onPress={() => onSelect(p.id)}
                  style={[s.touch, { left: at.x - TOUCH / 2, top: at.y - TOUCH / 2 }]}
                >
                  <View style={[s.marker, on && s.markerOn]}>
                    <Text style={[s.markerText, on && s.markerTextOn]} maxFontSizeMultiplier={1.2}>{i + 1}</Text>
                  </View>
                </Pressable>
              );
            })
          : null}
      </View>
      <Text style={s.caption}>{caption}</Text>
      <Text style={s.hint}>{labels.hint}</Text>
      <View style={s.parts} accessibilityLabel={labels.parts}>
        {points.map((p, i) => {
          const on = p.id === selected?.id;
          return (
            <Pressable
              key={p.id}
              testID={`part-${p.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onSelect(p.id)}
              style={({ pressed }) => [s.chip, on && s.chipOn, pressed && !on && s.chipPressed]}
            >
              <Text style={[s.chipText, on && s.chipTextOn]}>{`${i + 1}. ${p.label}`}</Text>
            </Pressable>
          );
        })}
      </View>
      {selected ? (
        <View style={s.detail}>
          <Text variant="eyebrow">{labels.closeup}</Text>
          <Text variant="subtitle" accessibilityRole="header" accessibilityLiveRegion="polite">{`${selectedIndex + 1}. ${selected.label}`}</Text>
          <Text style={s.body}>{selected.body}</Text>
          <View
            testID="photo-closeup"
            onLayout={(e) => setCloseupWidth(e.nativeEvent.layout.width)}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${labels.closeup}: ${selected.label}`}
            style={[s.closeup, { height: closeupHeight || undefined, aspectRatio: closeupHeight ? undefined : 1 / 0.6 }]}
          >
            {frame ? (
              <>
                <Image
                  source={source}
                  style={{ position: 'absolute', left: frame.offsetX, top: frame.offsetY, width: frame.imageWidth, height: frame.imageHeight }}
                  accessibilityIgnoresInvertColors
                />
                <View pointerEvents="none" style={[s.ring, { left: frame.markerX - 23, top: frame.markerY - 23 }]}>
                  <View style={s.ringInner} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => setMarks((v) => !v)}
        hitSlop={8}
        style={({ pressed }) => [s.toggle, pressed && s.togglePressed]}
      >
        <Text style={s.toggleText}>{marks ? labels.hideMarks : labels.showMarks}</Text>
      </Pressable>
    </View>
  );
}

const styles = bySurface((c) => StyleSheet.create({
  wrap: { gap: 12 },
  // No fill: a letterboxed image sits on the page itself, not in a coloured band.
  frame: { width: '100%' },
  imageBox: { position: 'absolute', borderRadius: radii.photo, overflow: 'hidden' },
  touch: { position: 'absolute', width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: c.accentCyan,
    backgroundColor: c.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  markerOn: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: c.bgCard, backgroundColor: c.accentCyan },
  markerText: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: c.accentCyan },
  markerTextOn: { color: c.bgCard, fontSize: 15 },
  caption: { fontSize: 13, lineHeight: 18, color: c.textMuted },
  hint: { fontSize: 15, lineHeight: 22, color: c.textSecondary },
  parts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: TOUCH,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(18, 50, 71, 0.28)',
    backgroundColor: c.bgCard,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: c.textPrimary, borderColor: c.textPrimary },
  chipPressed: { backgroundColor: c.bgCardHover },
  chipText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: c.textPrimary },
  chipTextOn: { color: c.bgCard },
  detail: { gap: 8, padding: 16, borderRadius: radii.card, backgroundColor: c.bgCard },
  body: { fontSize: 16, lineHeight: 24, color: c.textPrimary },
  closeup: { width: '100%', marginTop: 4, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: c.bgSecondary },
  // Blue ring inside a white halo: visible on white sailcloth and on the dark cover.
  ring: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: c.bgCard, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } },
  ringInner: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, borderColor: c.accentCyan },
  toggle: { alignSelf: 'flex-start', minHeight: TOUCH, justifyContent: 'center' },
  togglePressed: { opacity: 0.6 },
  toggleText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: c.accentCyan },
}));
