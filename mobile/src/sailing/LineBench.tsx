import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Button, Text } from "../design-system/components";
import { colors } from "../design-system/tokens";
import type { Language } from "../../../src/lib/product/catalog";
import { lineActions, lineCopy, lineReasons } from "../../../src/data/sailing-lab/line-bench-copy";
import { benchCommands, benchFaultReason, lineBenchHint, lineBenchOptions, lineBenchReadout } from "../../../src/features/sailing-lab/rig/line-bench-guide";
import { handleLine, newLineBench } from "../../../src/features/sailing-lab/rig/line-handling";
import { lineBenchSvg } from "../../../src/features/sailing-lab/rig/line-bench-diagram";

export function LineBench({ lang }: { lang: Language }) {
  const [state, setState] = useState(newLineBench);
  const [controlsOpen, setControlsOpen] = useState(false);
  const hint = lineBenchHint(state);
  return <View style={styles.content}>
    <Text variant="subtitle" accessibilityRole="header">{lineCopy.title[lang]}</Text>
    <Text style={styles.body}>{lineCopy.task[lang]}</Text>
    <View style={styles.diagram} accessible accessibilityRole="image" accessibilityLabel={`${lineCopy.legend[lang]} ${lineBenchReadout(state, lang)}`}><SvgXml xml={lineBenchSvg(state)} width="100%" height="100%" /></View>
    <View style={styles.legend}>{(["toSail", "clutch", "winch", "tail"] as const).map((key, i) => <Text key={key} style={styles.legendItem}>{i + 1}. {lineCopy[key][lang]}</Text>)}</View>
    <View style={styles.status} accessibilityLiveRegion="polite"><Text style={styles.bold}>{lineCopy.heldBy[lang]}: {lineCopy[state.owner][lang]}</Text><Text>{lineCopy.paidOut[lang]}: {Math.round(state.paidOut * 100)} cm</Text></View>
    <Text style={styles.note}>{lineBenchReadout(state, lang)}</Text>
    {state.fault && <View accessibilityRole="alert" style={styles.feedback}><Text style={styles.bold}>{lineCopy.blocked[lang]}</Text><Text style={styles.body}>{lineReasons[benchFaultReason[state.fault]][lang]}</Text></View>}
    {hint ? <View style={styles.content}><Text style={styles.body}>{hint.reason[lang]}</Text><Button onPress={() => setState(current => handleLine(current, hint.action))}>{hint.label[lang]}</Button></View> : <Text accessibilityLiveRegion="polite">✓ {lineCopy.complete[lang]}</Text>}
    <Button variant="ghost" accessibilityState={{ expanded: controlsOpen }} onPress={() => setControlsOpen(value => !value)}>{lineCopy.controls[lang]}</Button>
    {controlsOpen && <View style={styles.content}>{lineBenchOptions(state).map(id => <Button variant="secondary" key={id} onPress={() => setState(current => handleLine(current, benchCommands[id]))}>{lineActions[id][lang]}</Button>)}</View>}
    <Button variant="secondary" onPress={() => setState(newLineBench())}>{lineCopy.reset[lang]}</Button>
    <Text style={styles.note}>{lineCopy.limit[lang]}</Text>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  body: { fontSize: 16, lineHeight: 26 },
  note: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  bold: { fontWeight: "600" },
  diagram: { width: "100%", height: 180 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendItem: { width: "47%", fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  status: { gap: 8 },
  feedback: { borderWidth: 1, borderColor: colors.borderCyanSoft, backgroundColor: colors.bgSecondary, borderRadius: 8, padding: 16, gap: 12 },
});
