import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Swift has no unit tests here, so this guards the source. Passing the app's
// "current" controller as the parent of the VAST player crashed the whole app:
// UIKit throws when the parent is not an ancestor of the player's container.
const source = readFileSync(resolve(__dirname, '../modules/vox-ads/ios/VoxAdView.swift'), 'utf8');
const moduleSource = readFileSync(resolve(__dirname, '../modules/vox-ads/ios/VoxAdsModule.swift'), 'utf8');

describe('VoxAdView VAST player parent', () => {
  it('uses the controller that owns the slot, not the current one', () => {
    expect(source).not.toContain('currentViewController');
    expect(source).toMatch(/let controller = self\.owningViewController\(\)/);
    expect(source).toMatch(/parentController: controller/);
  });

  it('stops a player that was attached after the slot left the screen', () => {
    const after = source.slice(source.indexOf('try await VOXAds.createVASTVideo'));
    expect(after).toMatch(/guard current == self\.generation else \{\s*(\/\/.*\s*)*Self\.detachAds\(in: container\)/);
  });
});

// A request with no address is recorded by Hybrid on the website icoffio.com, and the
// pinned SDK has no default of its own, so the bridge must pass the address every time.
describe('VOX requests name the app', () => {
  it('sends the address and language from JS on the inline formats, with gdpr 1 and no consent string', () => {
    expect(source).toContain('AdRequestModel(placeId: placeId, browser: VoxAdsModule.browser(pageUrl: pageUrl, language: language), gdpr: 1)');
    expect(source).toMatch(/guard !placeId\.isEmpty, !pageUrl\.isEmpty, !language\.isEmpty else/);
    expect(moduleSource).toMatch(/Prop\("pageUrl"\)[^}]*view\.pageUrl = value/);
    expect(moduleSource).toMatch(/Prop\("language"\)[^}]*view\.language = value/);
  });

  it('sends the address and language on the full-screen format, with gdpr 1 and no consent string', () => {
    expect(moduleSource).toContain('AdRequestModel(placeId: placeId, browser: Self.browser(pageUrl: pageUrl, language: language), gdpr: 1)');
    expect(moduleSource).toMatch(/AsyncFunction\("showFullScreen"\) \{ \(placeId: String, closeButtonDelay: Double, pageUrl: String, language: String, promise: Promise\)/);
  });

  // The privacy texts say "app language": the device's preferred language is another value.
  it('sends the language chosen in the app, not the device language', () => {
    expect(moduleSource).toMatch(/BrowserModel\([^)]*language: language,/);
    expect(source + moduleSource).not.toMatch(/preferredLanguages|Locale\./);
  });

  it('never builds a request any other way and uses nothing the pinned SDK lacks', () => {
    const all = source + moduleSource;
    expect(all.match(/AdRequestModel\(/g)).toHaveLength(2);
    expect(all).not.toMatch(/gdprConsent|appIdentity/);
  });
});
