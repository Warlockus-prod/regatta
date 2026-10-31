import { STERNIK_BANK_FILE } from '@/data/sternik-bank-file.generated';

// ============================================================================
// Where the sternik bank comes from. On the website: the versioned JSON in
// public/sternik-bank/, fetched once per page load (the service worker keeps a
// copy for offline use). The iOS offline package has no network at all
// (connect-src 'none'), so mobile/scripts/build-sternik-offline.mjs replaces
// this module with one that inlines the same JSON file and preloads it.
// ============================================================================

/** A bank file already in memory, used before any fetch. null on the website. */
export const PRELOADED_STERNIK_BANK_FILE: unknown = null;

export async function readSternikBankFile(): Promise<unknown> {
  const res = await fetch(STERNIK_BANK_FILE.url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Sternik bank: HTTP ${res.status}`);
  return res.json();
}
