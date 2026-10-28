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
    const module = readFileSync(join(asr, "ios/ExpoSpeechRecognitionModule.swift"), "utf8");
    expect(module.match(/Function\("regattaOnDeviceRecognitionAvailable"\)/g)).toHaveLength(1);
    expect(module).toContain("self.resolveLocale(localeIdentifier: identifier)");
    expect(module).toContain("SFSpeechRecognizer(locale: locale)");
    expect(module).toContain("recognizer.isAvailable && recognizer.supportsOnDeviceRecognition");
    writeFileSync(join(speech, "package.json"), JSON.stringify({ version: "15.0.0" }));
    expect(() => patchSpeechSources(speech, "ios")).toThrow("review the patch");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

it("rejects a different recognition SDK version before changing either native source", () => {
  const directory = mkdtempSync(join(tmpdir(), "regatta-asr-version-"));
  try {
    cpSync(join(__dirname, "../node_modules/expo-speech-recognition"), directory, { recursive: true });
    const files = ["ios/ExpoSpeechRecognizer.swift", "ios/ExpoSpeechRecognitionModule.swift"];
    const before = files.map(file => readFileSync(join(directory, file), "utf8"));
    writeFileSync(join(directory, "package.json"), JSON.stringify({ version: "3.1.4" }));
    expect(() => patchRecognitionSources(directory)).toThrow("review the patch");
    expect(files.map(file => readFileSync(join(directory, file), "utf8"))).toEqual(before);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

it("checks every recognition anchor before writing any native source", () => {
  const directory = mkdtempSync(join(tmpdir(), "regatta-asr-anchor-"));
  try {
    cpSync(join(__dirname, "../node_modules/expo-speech-recognition"), directory, { recursive: true });
    const recognizer = join(directory, "ios/ExpoSpeechRecognizer.swift"), module = join(directory, "ios/ExpoSpeechRecognitionModule.swift");
    // Restore the original strictness anchor even if the local SDK was prebuilt.
    writeFileSync(recognizer, readFileSync(recognizer, "utf8").replace(
      "    // Regatta: an unsupported local model must fail, never use a server.\n    request.requiresOnDeviceRecognition = options.requiresOnDeviceRecognition",
      "    if recognizer.supportsOnDeviceRecognition {\n      request.requiresOnDeviceRecognition = options.requiresOnDeviceRecognition\n    }"));
    writeFileSync(module, readFileSync(module, "utf8").replaceAll('Function("isRecognitionAvailable")', 'Function("changedUpstream")')
      .replaceAll('Function("regattaOnDeviceRecognitionAvailable")', 'Function("changedRegattaAnchor")'));
    const before = [recognizer, module].map(file => readFileSync(file, "utf8"));
    expect(() => patchRecognitionSources(directory)).toThrow("upstream source changed");
    expect([recognizer, module].map(file => readFileSync(file, "utf8"))).toEqual(before);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
