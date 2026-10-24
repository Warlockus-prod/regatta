import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const { patchSpeechSources, patchRecognitionSources } = require("../plugins/with-local-radio-speech");

it("patches the installed SDK54 modules idempotently with native volume and strict local ASR", () => {
  const directory = mkdtempSync(join(tmpdir(), "regatta-speech-patch-"));
  try {
    const speech = join(directory, "speech"), asr = join(directory, "asr");
    cpSync(join(__dirname, "../node_modules/expo-speech"), speech, { recursive: true });
    cpSync(join(__dirname, "../node_modules/expo-speech-recognition"), asr, { recursive: true });
    for (let i = 0; i < 2; i++) { patchSpeechSources(speech, "ios"); patchSpeechSources(speech, "android"); patchRecognitionSources(asr); }
    const swift = readFileSync(join(speech, "ios/SpeechModule.swift"), "utf8");
    expect(swift.match(/utterance.volume =/g)).toHaveLength(1);
    const kotlin = readFileSync(join(speech, "android/src/main/java/expo/modules/speech/SpeechModule.kt"), "utf8");
    expect(kotlin).toContain("TextToSpeech.Engine.KEY_PARAM_VOLUME");
    expect(kotlin).toContain("filterNot { it.isNetworkConnectionRequired }");
    const recognizer = readFileSync(join(asr, "ios/ExpoSpeechRecognizer.swift"), "utf8");
    expect(recognizer).not.toContain("if recognizer.supportsOnDeviceRecognition {");
    expect(recognizer).toContain("request.requiresOnDeviceRecognition = options.requiresOnDeviceRecognition");
    writeFileSync(join(speech, "package.json"), JSON.stringify({ version: "15.0.0" }));
    expect(() => patchSpeechSources(speech, "ios")).toThrow("review the patch");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
