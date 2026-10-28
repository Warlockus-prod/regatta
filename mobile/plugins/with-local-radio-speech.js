// SDK54: real native TTS volume, local voices, strict on-device recognition.
// Keep the installed modules and add the missing platform assignments.
// Anchors and version assertions deliberately fail closed on dependency changes.
const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

function replaceOnce(source, before, after) {
  if (source.includes(after)) return source;
  if (source.split(before).length !== 2) throw new Error("Regatta speech volume: upstream source changed; review the SDK54 patch");
  return source.replace(before, after);
}
function patchSpeechSources(directory, platform) {
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  if (pkg.version !== "14.0.8") throw new Error("Regatta speech volume supports expo-speech14.0.8; review the patch before upgrading");
  const patches = platform === "ios" ? [
    ["ios/SpeechOptions.swift", "  @Field\n  var rate: Double?", "  @Field\n  var rate: Double?\n  @Field\n  var volume: Double?"],
    ["ios/SpeechModule.swift", "      synthesizer.speak(utterance)", "      utterance.volume = Float(min(1, max(0, options.volume ?? 1)))\n      synthesizer.speak(utterance)"],
  ] : [
    ["android/src/main/java/expo/modules/speech/SpeechOptions.kt", "  @Field val rate: Float?,", "  @Field val rate: Float?,\n  @Field val volume: Float?,"],
    ["android/src/main/java/expo/modules/speech/SpeechModule.kt", "      textToSpeech.voices.toList()", "      textToSpeech.voices.filterNot { it.isNetworkConnectionRequired }.toList()"],
    ["android/src/main/java/expo/modules/speech/SpeechModule.kt", "      TextToSpeech.QUEUE_ADD,\n      null,", "      TextToSpeech.QUEUE_ADD,\n      android.os.Bundle().apply { putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, (options.volume ?: 1f).coerceIn(0f, 1f)) },"],
  ];
  // Verify every anchor before writing any source, so a partial patch cannot pass.
  const changed = new Map();
  for (const [file, before, after] of patches) {
    const full = path.join(directory, file);
    const current = changed.get(full) ?? fs.readFileSync(full, "utf8");
    changed.set(full, replaceOnce(current, before, after));
  }
  for (const [file, source] of changed) fs.writeFileSync(file, source);
}

function patchRecognitionSources(directory) {
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  if (pkg.version !== "3.1.3") throw new Error("Regatta local ASR supports expo-speech-recognition3.1.3; review the patch before upgrading");
  const patches = [
    ["ios/ExpoSpeechRecognizer.swift",
      "    if recognizer.supportsOnDeviceRecognition {\n      request.requiresOnDeviceRecognition = options.requiresOnDeviceRecognition\n    }",
      "    // Regatta: an unsupported local model must fail, never use a server.\n    request.requiresOnDeviceRecognition = options.requiresOnDeviceRecognition"],
    ["ios/ExpoSpeechRecognitionModule.swift",
      '    Function("isRecognitionAvailable") { () -> Bool in',
      `    // Regatta: check the requested locale, not the phone's default language.
    Function("regattaOnDeviceRecognitionAvailable") { (identifier: String) -> Bool in
      guard let locale = self.resolveLocale(localeIdentifier: identifier),
        let recognizer = SFSpeechRecognizer(locale: locale) else { return false }
      return recognizer.isAvailable && recognizer.supportsOnDeviceRecognition
    }

    Function("isRecognitionAvailable") { () -> Bool in`],
  ];
  const changed = new Map();
  for (const [file, before, after] of patches) {
    const full = path.join(directory, file);
    changed.set(full, replaceOnce(fs.readFileSync(full, "utf8"), before, after));
  }
  for (const [file, source] of changed) fs.writeFileSync(file, source);
}

module.exports = function withLocalRadioSpeech(config) {
  for (const platform of ["ios", "android"]) {
    config = withDangerousMod(config, [platform, async next => {
      const entry = require.resolve("expo-speech/package.json", { paths: [next.modRequest.projectRoot] });
      patchSpeechSources(path.dirname(entry), platform);
      if (platform === "ios") {
        const asr = require.resolve("expo-speech-recognition/package.json", { paths: [next.modRequest.projectRoot] });
        patchRecognitionSources(path.dirname(asr));
      }
      return next;
    }]);
  }
  return config;
};
module.exports.patchSpeechSources = patchSpeechSources;
module.exports.patchRecognitionSources = patchRecognitionSources;
