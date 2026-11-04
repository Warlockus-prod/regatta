import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Swift has no unit tests here, so this guards the source. Passing the app's
// "current" controller as the parent of the VAST player crashed the whole app:
// UIKit throws when the parent is not an ancestor of the player's container.
const source = readFileSync(resolve(__dirname, '../modules/vox-ads/ios/VoxAdView.swift'), 'utf8');

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
