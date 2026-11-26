import { STERNIK_BANK_FILE } from '@/data/sternik-bank-file.generated';
import { parseSternikBankFile, type SternikBank } from '@/data/sternik-core';
import { PRELOADED_STERNIK_BANK_FILE, readSternikBankFile } from './bank-source';

// ============================================================================
// Runtime loader for the sternik question bank (see src/data/sternik-core.ts).
// One request per page load: the trainer, the exam and the personal report
// share the result. A failed load is NOT remembered, so Retry really asks the
// network again instead of replaying the same rejection.
// ============================================================================

export type SternikBankReader = () => Promise<unknown>;

let ready: SternikBank | null = PRELOADED_STERNIK_BANK_FILE
  ? parseSternikBankFile(PRELOADED_STERNIK_BANK_FILE, STERNIK_BANK_FILE.version)
  : null;
let pending: Promise<SternikBank> | null = null;

/** The bank if it is already loaded (or preloaded), else null. */
export function peekSternikBank(): SternikBank | null {
  return ready;
}

/** Load (once) and validate the bank. Rejects on network or shape errors. */
export function loadSternikBank(read: SternikBankReader = readSternikBankFile): Promise<SternikBank> {
  if (ready) return Promise.resolve(ready);
  if (!pending) {
    pending = read()
      .then((raw) => parseSternikBankFile(raw, STERNIK_BANK_FILE.version))
      .then(
        (bank) => { ready = bank; pending = null; return bank; },
        (error: unknown) => { pending = null; throw error; },
      );
  }
  return pending;
}

/** Tests only: forget the loaded bank. */
export function resetSternikBankForTests(): void {
  ready = null;
  pending = null;
}
