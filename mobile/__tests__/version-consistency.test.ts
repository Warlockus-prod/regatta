/**
 * Guards against the historical bug where `app/settings.tsx` carried a
 * hardcoded `Version X.Y.Z (build N)` string that drifted from
 * `app.json` on every release. The fix was to read both values from
 * `expo-constants` at runtime; this canary makes sure no future commit
 * regresses by re-introducing a hardcoded version literal.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SETTINGS_PATH = join(__dirname, '..', 'app', 'settings.tsx');
const APP_JSON_PATH = join(__dirname, '..', 'app.json');

interface ExpoConfig {
  expo: {
    version: string;
    ios?: { buildNumber?: string };
    android?: { versionCode?: number };
  };
}

describe('Version consistency between Settings card and app.json', () => {
  const settingsSource = readFileSync(SETTINGS_PATH, 'utf8');
  const appConfig = JSON.parse(readFileSync(APP_JSON_PATH, 'utf8')) as ExpoConfig;

  it('Settings reads the version dynamically from expo-constants', () => {
    expect(settingsSource).toMatch(/from ['"]expo-constants['"]/);
    expect(settingsSource).toMatch(/Constants\.expoConfig\?\.version/);
  });

  it('Settings reads the build number dynamically from expo-constants', () => {
    expect(settingsSource).toMatch(/Constants\.expoConfig\?\.ios\?\.buildNumber/);
  });

  it('no hardcoded semver literal sneaks back into Settings', () => {
    const literal = settingsSource.match(/'(\d+\.\d+\.\d+)'/);
    expect(literal).toBeNull();
  });

  it('ios.buildNumber and android.versionCode stay in lockstep', () => {
    const ios = appConfig.expo.ios?.buildNumber;
    const android = appConfig.expo.android?.versionCode;
    expect(Number(ios)).toBe(android);
  });
});
