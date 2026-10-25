/**
 * Guards App Store privacy declarations in app.json and the locales:
 *
 * 1. The privacy manifest sits at `expo.ios.privacyManifests`, the only place
 *    Expo's PrivacyInfo plugin reads it. From build 2 to 48 it sat inside the
 *    expo-build-properties plugin options, which ignore it, so the shipped
 *    PrivacyInfo.xcprivacy declared no collected data at all.
 * 2. Microphone and speech recognition purposes name local SRC practice.
 * 3. The bundled file reader's unused Photos APIs still require a localized
 *    purpose string for Apple's binary scan, without inventing a photo feature.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

type CollectedType = {
  NSPrivacyCollectedDataType: string;
  NSPrivacyCollectedDataTypeLinked: boolean;
  NSPrivacyCollectedDataTypeTracking: boolean;
  NSPrivacyCollectedDataTypePurposes: string[];
};
interface AppJson {
  expo: {
    ios: {
      infoPlist: { NSMicrophoneUsageDescription: string; NSSpeechRecognitionUsageDescription: string; NSPhotoLibraryUsageDescription: string };
      privacyManifests?: {
        NSPrivacyTracking: boolean;
        NSPrivacyCollectedDataTypes: CollectedType[];
        NSPrivacyAccessedAPITypes: { NSPrivacyAccessedAPIType: string }[];
      };
    };
    locales: Record<string, string>;
    plugins: (string | [string, Record<string, unknown>])[];
  };
}

const appJson = JSON.parse(readFileSync(join(MOBILE_ROOT, 'app.json'), 'utf8')) as AppJson;

describe('iOS privacy manifest', () => {
  const manifest = appJson.expo.ios.privacyManifests;

  it('lives at expo.ios.privacyManifests', () => {
    expect(manifest).toBeDefined();
  });

  // Must match the App Privacy label published in App Store Connect on
  // 2026-10-19 (release gate G4b): same six types and purposes, none linked
  // to identity, none used for tracking.
  it('declares exactly the six types of the published App Privacy label', () => {
    const byType = Object.fromEntries(
      manifest!.NSPrivacyCollectedDataTypes.map((t) => [t.NSPrivacyCollectedDataType, t.NSPrivacyCollectedDataTypePurposes]),
    );
    expect(byType).toEqual({
      NSPrivacyCollectedDataTypeProductInteraction: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
      NSPrivacyCollectedDataTypeOtherDiagnosticData: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
      NSPrivacyCollectedDataTypeCoarseLocation: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
      NSPrivacyCollectedDataTypeGameplayContent: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
      NSPrivacyCollectedDataTypeOtherUserContent: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
      NSPrivacyCollectedDataTypeAudioData: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
    });
    for (const t of manifest!.NSPrivacyCollectedDataTypes) {
      expect(t.NSPrivacyCollectedDataTypeLinked).toBe(false);
    }
  });

  it('declares the analytics data the app collects, not used for tracking', () => {
    const types = manifest!.NSPrivacyCollectedDataTypes.map((t) => t.NSPrivacyCollectedDataType);
    expect(types).toEqual(
      expect.arrayContaining([
        'NSPrivacyCollectedDataTypeProductInteraction',
        'NSPrivacyCollectedDataTypeOtherDiagnosticData',
      ]),
    );
    expect(manifest!.NSPrivacyTracking).toBe(false);
    for (const t of manifest!.NSPrivacyCollectedDataTypes) {
      expect(t.NSPrivacyCollectedDataTypeTracking).toBe(false);
    }
  });

  it('keeps the required-reason API declarations', () => {
    const apis = manifest!.NSPrivacyAccessedAPITypes.map((a) => a.NSPrivacyAccessedAPIType);
    expect(apis).toEqual(
      expect.arrayContaining([
        'NSPrivacyAccessedAPICategoryUserDefaults',
        'NSPrivacyAccessedAPICategoryFileTimestamp',
        'NSPrivacyAccessedAPICategorySystemBootTime',
        'NSPrivacyAccessedAPICategoryDiskSpace',
      ]),
    );
  });

  it('is not hidden in plugin options again, where Expo ignores it', () => {
    const pluginOptions = appJson.expo.plugins
      .filter((p): p is [string, Record<string, unknown>] => Array.isArray(p))
      .map(([, options]) => JSON.stringify(options));
    for (const options of pluginOptions) expect(options).not.toContain('privacyManifests');
  });
});

describe('microphone purpose string', () => {
  const localeFiles = readdirSync(join(MOBILE_ROOT, 'locales')).filter((f) => f.endsWith('.json'));

  it('is localised for all 7 languages', () => {
    expect(Object.keys(appJson.expo.locales).sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'pl', 'ru']);
    expect(localeFiles.sort()).toEqual(['de.json', 'en.json', 'es.json', 'fr.json', 'it.json', 'pl.json', 'ru.json']);
  });

  const strings: [string, string][] = [
    ['app.json', appJson.expo.ios.infoPlist.NSMicrophoneUsageDescription],
    ...localeFiles.map((f): [string, string] => [
      f,
      (JSON.parse(readFileSync(join(MOBILE_ROOT, 'locales', f), 'utf8')) as { NSMicrophoneUsageDescription: string })
        .NSMicrophoneUsageDescription,
    ]),
  ];

  it.each(strings)('%s names SRC radio practice without claiming microphone use for typed Sternik', (_file, text) => {
    expect(text).toMatch(/SRC/);
    expect(text).toMatch(/MAYDAY/);
    expect(text).toMatch(/PAN-PAN/);
    expect(text.toLowerCase()).not.toMatch(/sternik/);
  });
  it('keeps the recognition plugin and native microphone purpose consistent', () => {
    const plugin = appJson.expo.plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-speech-recognition');
    expect(Array.isArray(plugin) && plugin[1].microphonePermission).toBe(appJson.expo.ios.infoPlist.NSMicrophoneUsageDescription);
  });
});

it('localises the on-device SRC transcription purpose through the existing Expo locale files', () => {
  for (const locale of Object.keys(appJson.expo.locales)) {
    const data = JSON.parse(readFileSync(join(MOBILE_ROOT, 'locales', `${locale}.json`), 'utf8'));
    expect(data.NSSpeechRecognitionUsageDescription).toEqual(expect.stringContaining('SRC'));
    expect(data.NSSpeechRecognitionUsageDescription.length).toBeGreaterThan(50);
  }
  const plugin = appJson.expo.plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-speech-recognition');
  expect(Array.isArray(plugin) && plugin[1].speechRecognitionPermission).toBe(appJson.expo.ios.infoPlist.NSSpeechRecognitionUsageDescription);
});

describe('bundled file reader Photos declaration', () => {
  it('declares the purpose required by expo-file-system Photos references without claiming an app photo feature', () => {
    const vendor = readFileSync(join(MOBILE_ROOT, 'node_modules/expo-file-system/ios/Legacy/FileSystemHelpers.swift'), 'utf8');
    expect(vendor).toContain('PHPhotoLibrary.authorizationStatus');
    const purpose = appJson.expo.ios.infoPlist.NSPhotoLibraryUsageDescription;
    expect(purpose).toContain('does not request or use access');
    expect(purpose).toContain('built-in file reader');
    const source = readFileSync(join(MOBILE_ROOT, 'src/course/local-course-asset.ts'), 'utf8');
    expect(source).toContain('/^(?:file|assets?|content):/');
    expect(source).toContain('readAsStringAsync(uri');
  });

  it('includes a distinct Photos purpose for every registered language and keeps the default English in sync', () => {
    const purposes = Object.keys(appJson.expo.locales).map(locale => {
      const data = JSON.parse(readFileSync(join(MOBILE_ROOT, 'locales', `${locale}.json`), 'utf8'));
      expect(data.NSPhotoLibraryUsageDescription).toEqual(expect.stringContaining('Regatta'));
      expect(data.NSPhotoLibraryUsageDescription.length).toBeGreaterThan(100);
      expect(data.NSPhotoLibraryUsageDescription).not.toMatch(/[\u2013\u2014]/);
      if (locale === 'en') expect(data.NSPhotoLibraryUsageDescription).toBe(appJson.expo.ios.infoPlist.NSPhotoLibraryUsageDescription);
      return data.NSPhotoLibraryUsageDescription;
    });
    expect(new Set(purposes).size).toBe(7);
  });
});
