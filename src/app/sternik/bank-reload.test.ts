import { describe, expect, it, vi } from 'vitest';
import { STERNIK_BANK_FILE } from '@/data/sternik-bank-file.generated';
import { reloadOnceForNewBank, SternikBankGoneError } from './bank-reload';
import { readSternikBankFile } from './bank-source';

// Contract: a page left open across a deploy asks for a bank file that is gone.
// It reloads itself once per bank version; a repeat 404 or any other failure
// shows the error with Retry instead of a reload loop.

function memoryStorage() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, map };
}

describe('reloadOnceForNewBank', () => {
  it('reloads once for a gone bank file, then leaves the error to Retry', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    expect(reloadOnceForNewBank(new SternikBankGoneError('404'), storage, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.map.has(`regatta.sternik.bank-reload.${STERNIK_BANK_FILE.version}`)).toBe(true);
    expect(reloadOnceForNewBank(new SternikBankGoneError('404'), storage, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('never reloads for an offline or server error', () => {
    const reload = vi.fn();
    expect(reloadOnceForNewBank(new Error('HTTP 503'), memoryStorage(), reload)).toBe(false);
    expect(reloadOnceForNewBank(new TypeError('Failed to fetch'), memoryStorage(), reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when it cannot remember the reload', () => {
    const reload = vi.fn();
    const blocked = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(reloadOnceForNewBank(new SternikBankGoneError('404'), blocked, reload)).toBe(false);
    expect(reloadOnceForNewBank(new SternikBankGoneError('404'), null, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('readSternikBankFile', () => {
  it('names a 404 as a gone file and any other status as a plain failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(readSternikBankFile()).rejects.toBeInstanceOf(SternikBankGoneError);
      const other = await readSternikBankFile().catch((e: unknown) => e);
      expect(other).toBeInstanceOf(Error);
      expect(other).not.toBeInstanceOf(SternikBankGoneError);
      expect(fetchMock).toHaveBeenCalledWith(STERNIK_BANK_FILE.url, { credentials: 'same-origin' });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
