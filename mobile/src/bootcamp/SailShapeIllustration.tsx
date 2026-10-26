import { useEffect, useRef, useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { sailShapeContent as copy } from "../../../src/data/sail-shape";
import { renderSailShapeMarkers } from "../../../src/lib/learning/sail-shape-markers";
import { Text } from "../design-system/components";
import { bySurface, useSurface } from "../design-system/surface";
import { recordNativeDiagnostic } from "../diagnostics/journal";
import { useI18n } from "../i18n/context";

const images = [require("../../../public/learning/mainsail-filled.jpg"), require("../../../public/learning/mainsail-luffing.jpg")];

export function SailShapeIllustration({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const s = styles[useSurface()];
  const [mode, setMode] = useState<"scheme" | "picture">("scheme");
  const [frameIndex, setFrameIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const attempt = useRef(0);
  const settled = useRef(-1);
  useEffect(() => () => { attempt.current += 1; }, []);
  const frame = copy.frames[frameIndex];
  const token = attempt.current;
  function chooseMode(value: typeof mode) {
    const unchanged = mode === value;
    recordNativeDiagnostic({ type: "learning.visual", source: "native", surface: "learn", lesson: "how-sail-works", action: "mode", mode: value, frame: frame.id, outcome: unchanged ? "noop" : "accepted", ...(unchanged ? { reason: "unchanged" as const } : {}) });
    if (unchanged) return;
    attempt.current += 1; setFailed(false); setMode(value);
  }
  function chooseFrame(index: number) {
    const unchanged = index === frameIndex;
    recordNativeDiagnostic({ type: "learning.visual", source: "native", surface: "learn", lesson: "how-sail-works", action: "frame", mode, frame: copy.frames[index].id, outcome: unchanged ? "noop" : "accepted", ...(unchanged ? { reason: "unchanged" as const } : {}) });
    if (unchanged) return;
    attempt.current += 1; setFrameIndex(index); setFailed(false);
  }
  function imageResult(ok: boolean) {
    if (attempt.current !== token || settled.current === token) return;
    settled.current = token;
    recordNativeDiagnostic({ type: "learning.visual", source: "native", surface: "learn", lesson: "how-sail-works", action: ok ? "image-ready" : "image-error", mode: "picture", frame: frame.id, outcome: ok ? "accepted" : "failed", ...(!ok ? { reason: "asset-load" as const } : {}) });
    if (!ok) { attempt.current += 1; setMode("scheme"); setFailed(true); }
  }
  return <View style={s.wrap}>
    <View style={s.choices} accessibilityLabel={copy.view[lang]}>
      {(["scheme", "picture"] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => chooseMode(value)} style={[s.button, mode === value && s.on]}><Text style={[s.label, mode === value && s.onLabel]}>{copy[value][lang]}</Text></Pressable>)}
    </View>
    {failed && <Text accessibilityLiveRegion="polite">{copy.unavailable[lang]}</Text>}
    {mode === "picture" && <View style={s.wrap}>
      <View style={s.choices} accessibilityLabel={copy.shape[lang]}>
        {copy.frames.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: frameIndex === index }} onPress={() => chooseFrame(index)} style={[s.button, frameIndex === index && s.on]}><Text style={[s.label, frameIndex === index && s.onLabel]}>{item.label[lang]}</Text></Pressable>)}
      </View>
      <View style={s.photo}>
        <Image key={`${frame.id}-${token}`} testID={`sail-shape-${frame.id}`} source={images[frameIndex]} accessible accessibilityLabel={frame.description[lang]} resizeMode="contain" style={[StyleSheet.absoluteFill, s.image]} onLoad={() => imageResult(true)} onError={() => imageResult(false)} />
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}><SvgXml xml={renderSailShapeMarkers()} width="100%" height="100%" /></View>
      </View>
      <Text accessibilityLiveRegion="polite">{frame.note[lang]}</Text>
      {copy.markers.map((label, index) => <Text key={index}>{index + 1}. {label[lang]}</Text>)}
      <Text style={s.limit}>{copy.limit[lang]}</Text>
      <Text variant="subtitle" accessibilityRole="header">{copy.forceView[lang]}</Text>
    </View>}
    {children}
  </View>;
}

const styles = bySurface(c => StyleSheet.create({
  wrap: { gap: 16 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { flexGrow: 1, flexBasis: 130, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: c.textMuted, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.bgCard },
  on: { backgroundColor: c.textPrimary, borderColor: c.textPrimary },
  label: { color: c.textPrimary, fontSize: 16, lineHeight: 24, fontWeight: "600", textAlign: "center" },
  onLabel: { color: c.bgCard },
  image: { width: "100%", height: "100%" },
  photo: { width: "100%", aspectRatio: 3 / 2, overflow: "hidden", borderRadius: 16, backgroundColor: c.bgCard },
  limit: { color: c.textSecondary, fontSize: 14, lineHeight: 21 },
}));
