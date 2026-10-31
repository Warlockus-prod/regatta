import { STERNIK_BANK_FILE } from '@/data/sternik-bank-file.generated';

// ============================================================================
// A page opened before a deploy still asks for the old versioned bank file,
// which the new release no longer serves. One reload per file version fetches
// the new page and its new file; a second 404 for the same version is a real
// failure and keeps the error with Retry. Kept apart from ./bank-source so the
// iOS offline package (which replaces that reader) carries no fetch code.
// ============================================================================

/** The server no longer has this page's bank file: a deploy replaced it. */
export class SternikBankGoneError extends Error {}

type ReloadStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Returns true when a reload was started. */
export function reloadOnceForNewBank(
  error: unknown,
  storage: ReloadStorage | null = safeSessionStorage(),
  reload: () => void = () => window.location.reload(),
): boolean {
  if (!(error instanceof SternikBankGoneError) || !storage) return false;
  const key = `regatta.sternik.bank-reload.${STERNIK_BANK_FILE.version}`;
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, '1');
  } catch {
    return false;
  }
  reload();
  return true;
}

function safeSessionStorage(): ReloadStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
