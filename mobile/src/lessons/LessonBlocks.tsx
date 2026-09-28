import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DiagramStates, PhotoAnnotation, Text } from '../design-system/components';
import { bySurface, useSurface, useSurfaceColors } from '../design-system/surface';
import { radii } from '../design-system/tokens';
import { useI18n } from '../i18n/context';
import { renderScene, SCENE_HEIGHT, SCENE_WIDTH, type SceneState } from './graphics/drawings';
import { scenes } from './graphics/scenes';
import type { AnnotatedPhoto } from './graphics/photos';
import { lessonCopy, type LessonPilot } from './pilots';

/**
 * The parts of the v3 lesson template (ADR-0015), shared by the bootcamp
 * lesson and the sail course lesson. Each lesson screen keeps its own
 * header, check and progress rules and places these blocks in template order.
 */

/** Goal and the real situation where it matters. */
export function LessonIntro({ pilot }: { pilot: LessonPilot }) {
  const { lang } = useI18n();
  const s = styles[useSurface()];
  return (
    <View style={s.card}>
      <View style={s.block}>
        <Text variant="eyebrow">{lessonCopy.goal[lang]}</Text>
        <Text style={s.body}>{pilot.goal[lang]}</Text>
      </View>
      <View style={s.block}>
        <Text variant="eyebrow">{lessonCopy.situation[lang]}</Text>
        <Text style={s.body}>{pilot.situation[lang]}</Text>
      </View>
    </View>
  );
}

/** The lesson drawing with its states, key and limit. */
export function LessonScene({ pilot }: { pilot: LessonPilot }) {
  const { lang } = useI18n();
  const surface = useSurface();
  const [state, setState] = useState<SceneState>(0);
  const scene = scenes[pilot.scene];
  return (
    <DiagramStates
      svg={(i) => renderScene(pilot.scene, i as SceneState, surface === 'dark' ? 'instrument' : 'paper')}
      aspectRatio={SCENE_WIDTH / SCENE_HEIGHT}
      title={pilot.sceneRole === 'lead' ? scene.title[lang] : undefined}
      states={scene.states.map((st) => ({ label: st.label[lang], note: st.note[lang], description: st.description[lang] }))}
      stateGroup={scene.stateGroup[lang]}
      selected={state}
      onSelect={(i) => setState(i as SceneState)}
      legend={scene.legend.map((l) => l[lang])}
      legendFollowsState={pilot.scene === 'rig-basics'}
      limit={scene.limit[lang]}
      labels={{ legend: lessonCopy.legend[lang], limit: lessonCopy.limit[lang] }}
    />
  );
}

/** Recognise the thing first: the annotated image. */
export function LessonPhoto({ photo }: { photo: AnnotatedPhoto }) {
  const { lang } = useI18n();
  const [selected, setSelected] = useState(photo.points[0]!.id);
  return (
    <View style={{ gap: 12 }}>
      <Text variant="subtitle" accessibilityRole="header">{photo.title[lang]}</Text>
      <PhotoAnnotation
        source={photo.source}
        imageWidth={photo.width}
        imageHeight={photo.height}
        points={photo.points.map((p) => ({ id: p.id, x: p.x, y: p.y, label: p.label[lang], body: p.body[lang] }))}
        selectedId={selected}
        onSelect={setSelected}
        description={photo.description[lang]}
        caption={photo.caption[lang]}
        labels={{
          hint: lessonCopy.photoHint[lang],
          parts: lessonCopy.parts[lang],
          closeup: lessonCopy.closeup[lang],
          hideMarks: lessonCopy.hideMarks[lang],
          showMarks: lessonCopy.showMarks[lang],
        }}
      />
    </View>
  );
}

/**
 * "How it works": the drawing as a separate layer after the image. A full
 * width row with a plain title and the names of what it shows, so it is not a
 * hidden button; the lesson text stays visible either way.
 */
export function HowItWorks({ pilot }: { pilot: LessonPilot }) {
  const { lang } = useI18n();
  const c = useSurfaceColors();
  const s = styles[useSurface()];
  const [open, setOpen] = useState(false);
  const scene = scenes[pilot.scene];
  return (
    <View style={s.card}>
      <Pressable
        testID="how-it-works"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={open ? lessonCopy.hideDiagram[lang] : lessonCopy.showDiagram[lang]}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [s.disclosure, pressed && s.pressed]}
      >
        <View style={s.disclosureText}>
          <Text variant="subtitle">{lessonCopy.howItWorks[lang]}</Text>
          <Text style={s.disclosureCaption}>{scene.summary[lang]}</Text>
        </View>
        <Svg width={16} height={10} viewBox="0 0 16 10" style={open ? s.chevronOpen : undefined} accessibilityElementsHidden importantForAccessibility="no">
          <Path d="M2 2l6 6 6-6" stroke={c.textSecondary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      {open ? <LessonScene pilot={pilot} /> : null}
    </View>
  );
}

/** Explanation paragraphs under a heading. */
export function LessonExplanation({ paragraphs }: { paragraphs: string[] }) {
  const { lang } = useI18n();
  const s = styles[useSurface()];
  return (
    <View style={s.section}>
      <Text variant="subtitle" accessibilityRole="header">{lessonCopy.explanation[lang]}</Text>
      {paragraphs.map((p, i) => <Text key={i} style={s.body}>{p}</Text>)}
    </View>
  );
}

/** The mistake beginners make here. */
export function LessonMistake({ pilot }: { pilot: LessonPilot }) {
  const { lang } = useI18n();
  const s = styles[useSurface()];
  return (
    <View style={[s.card, s.mistake]}>
      <Text variant="eyebrow">{lessonCopy.mistake[lang]}</Text>
      <Text style={s.body}>{pilot.mistake[lang]}</Text>
    </View>
  );
}

const styles = bySurface((c) => StyleSheet.create({
  card: { gap: 16, padding: 16, borderRadius: radii.card, backgroundColor: c.bgCard },
  block: { gap: 6 },
  section: { gap: 12 },
  body: { fontSize: 16, lineHeight: 24, color: c.textPrimary },
  mistake: { borderLeftWidth: 4, borderLeftColor: c.sandStrong },
  disclosure: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  disclosureText: { flex: 1, gap: 4 },
  disclosureCaption: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  pressed: { opacity: 0.7 },
}));
