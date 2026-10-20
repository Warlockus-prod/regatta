import { useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button, Text } from "../design-system/components";
import { guideCopy } from "../../../src/data/sailing-lab/lesson-guide";
import type { Language } from "../../../src/lib/product/catalog";
import { PRACTICE_RESULTS_KEY, mergePracticeResults, readPracticeResults, type PracticeId } from "../../../src/features/sailing-lab/lessons/practice-results";

/** The parent mounts this only after the bench reaches its completed state. */
export function SavePractice({ id, lang }: { id: PracticeId; lang: Language }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const save = async () => {
    if (status === "saving" || status === "saved") return;
    setStatus("saving");
    try {
      const previous = readPracticeResults(await AsyncStorage.getItem(PRACTICE_RESULTS_KEY));
      await AsyncStorage.setItem(PRACTICE_RESULTS_KEY, JSON.stringify(mergePracticeResults(previous, { version: 1, completed: { [id]: Date.now() } })));
      setStatus("saved");
    } catch { setStatus("error"); }
  };
  return <View style={{ gap: 12 }}>
    {status === "saved" ? <Text accessibilityLiveRegion="polite">✓ {guideCopy.saved[lang]}</Text> : <Button disabled={status === "saving"} onPress={() => { void save(); }}>{guideCopy[status === "saving" ? "saving" : "save"][lang]}</Button>}
    {status === "error" && <Text accessibilityRole="alert">{guideCopy.saveError[lang]}</Text>}
  </View>;
}
